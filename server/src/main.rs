// ─── 模組與引用 ──────────────────────────────────────────────
pub mod game;

use axum::{
    extract::{ws::{Message, WebSocket, WebSocketUpgrade}, State},
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use futures_util::{SinkExt, StreamExt};
use std::collections::HashMap;
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::sync::{broadcast, RwLock};
use tower_http::cors::CorsLayer;
use shared::protocol::{GameMessage, GameStage, Player, RoomState};
use tracing::{debug, info};
use serde_json::Value;

// ─── 狀態管理資料結構 ──────────────────────────────────────────

/// 記憶體中的房間結構
/// - `state`: 當前房間的遊戲階段與玩家名單
/// - `tx`: 用於向房間內所有連線廣播即時訊息的頻道發送端
pub struct Room {
    pub state: RoomState,
    pub tx: broadcast::Sender<GameMessage>,
}

/// 執行緒安全的房間列表資料庫 (Key: 房間代碼 room_id, Value: 房間實例 Room)
pub type Db = Arc<RwLock<HashMap<String, Room>>>;

/// Axum 全域共享狀態
/// 注入至所有路由處理器 (Handler) 中，提供多執行緒安全存取
#[derive(Clone)]
pub struct AppState {
    /// 多人即時連線房間清單
    pub db: Db,
    /// 魔典 (Grimoire) 核心遊戲狀態
    pub game_state: Arc<RwLock<game::GameState>>,
}

// ─── 主程式進入點 ──────────────────────────────────────────────

#[tokio::main]
async fn main() {
    // 1. 初始化日誌輸出系統 (支援 RUST_LOG 環境變數設定，預設等級 info)
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()),
        )
        .init();

    // 2. 建立全域執行緒安全狀態庫
    let state = AppState {
        db: Arc::new(RwLock::new(HashMap::new())),
        game_state: Arc::new(RwLock::new(game::GameState::default())),
    };

    // 3. 建立並配置 HTTP / WebSocket 路由樹
    let app = create_app(state);

    // 4. 綁定監聽連接埠 (預設本機 127.0.0.1:3030，容器環境下轉發)
    let addr = SocketAddr::from(([127, 0, 0, 1], 3030));
    info!("BOTC 遊戲伺服器已啟動，監聽 http://{}", addr);

    let listener = tokio::net::TcpListener::bind(&addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

/// 建立全域路由應用
/// 
/// 路由表：
/// - `GET  /`               : 伺服器存活健康檢查
/// - `GET  /ws`             : 即時多人房間 WebSocket 連線升級
/// - `GET  /api/game/state` : 查詢當前魔典完整遊戲狀態
/// - `POST /api/game/action`: 執行魔典指令 (支援 new_game, add_player, assign_role 等)
/// 
/// 參數：
/// - `state`: 注入的全域共享狀態實例
pub fn create_app(state: AppState) -> Router {
    let cors = CorsLayer::permissive();
    Router::new()
        .route("/", get(index))
        .route("/ws", get(ws_handler))
        .route("/api/game/state", get(game_state_handler))
        .route("/api/game/action", post(game_action_handler))
        .with_state(state)
        .layer(cors)
}

/// API 動作請求承載結構
/// 
/// 欄位：
/// - `cmd` : 指令名稱 (例如: "new_game", "add_player", "assign_role", "set_phase" 等)
/// - `args`: 指令所附帶之具體參數物件 (例如: `{ "name": "小明" }`)
#[derive(serde::Deserialize)]
pub struct ActionRequest {
    pub cmd: String,
    #[serde(default)]
    pub args: Value,
}

/// [API] 取得魔典最新遊戲狀態
/// 
/// 路由：`GET /api/game/state`
/// 回應：`200 OK` + `GameState` JSON
async fn game_state_handler(State(state): State<AppState>) -> impl IntoResponse {
    let gs = state.game_state.read().await;
    Json(serde_json::to_value(&*gs).unwrap_or(Value::Null))
}

/// [API] 執行魔典遊戲操作指令
/// 
/// 路由：`POST /api/game/action`
/// 請求 Body (JSON)：
/// ```json
/// {
///   "cmd": "add_player",
///   "args": { "name": "玩家名稱" }
/// }
/// ```
/// 回應：
/// - 成功：`200 OK` + 更新後的 `GameState` JSON
/// - 失敗：`400 Bad Request` + `{ "error": "錯誤原因說明" }`
async fn game_action_handler(
    State(state): State<AppState>,
    Json(req): Json<ActionRequest>,
) -> impl IntoResponse {
    let mut gs = state.game_state.write().await;
    match game::execute_action(&mut gs, &req.cmd, req.args) {
        Ok(val) => (axum::http::StatusCode::OK, Json(val)).into_response(),
        Err(err) => (
            axum::http::StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": err })),
        ).into_response(),
    }
}

/// [API] 伺服器健康檢查根端點
/// 
/// 路由：`GET /`
/// 回應：字串提示伺服器正在正常運行
async fn index() -> &'static str {
    "BOTC Game Server with Multi-room support is Running!"
}

/// [API] WebSocket 升級連線端點
/// 
/// 路由：`GET /ws`
/// 用途：將常規 HTTP GET 協定升級為雙向全雙工 WebSocket 連線
async fn ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_socket(socket, state))
}

// ─── WebSocket 連線生命週期管理 ──────────────────────────────

/// WebSocket 雙向訊息處理生命週期函式
/// 
/// 參數：
/// - `socket`: 升級後的底層 WebSocket 連線通訊套接字
/// - `state` : 全域共享狀態 (含房間列表資料庫)
async fn handle_socket(socket: WebSocket, state: AppState) {
    info!("新玩家已建立 TCP/WebSocket 連線，等待加入房間...");

    let (mut ws_sender, mut ws_receiver) = socket.split();

    // 1. 第一階段：等待加入房間訊息
    let mut room_id = String::new();
    let mut player_name = String::new();
    let mut player_id = String::new();

    while let Some(Ok(msg)) = ws_receiver.next().await {
        if let Message::Text(text) = msg {
            if let Ok(GameMessage::JoinRoom { room_id: r_id, player_name: p_name }) =
                serde_json::from_str::<GameMessage>(&text)
            {
                if r_id.trim().is_empty() || p_name.trim().is_empty() {
                    let err_msg = GameMessage::SystemMessage("房間號或玩家名稱不可為空".to_string());
                    if let Ok(serialized) = serde_json::to_string(&err_msg) {
                        let _ = ws_sender.send(Message::Text(serialized)).await;
                    }
                    continue;
                }
                room_id = r_id;
                player_name = p_name;
                // 分配一個簡單且唯一的玩家 ID (使用毫秒級時間戳記)
                player_id = tokio::time::Instant::now().elapsed().as_nanos().to_string();
                break;
            } else {
                let err_msg = GameMessage::SystemMessage("在加入房間前不能發送其他訊息".to_string());
                if let Ok(serialized) = serde_json::to_string(&err_msg) {
                    let _ = ws_sender.send(Message::Text(serialized)).await;
                }
            }
        }
    }

    // 若玩家在中途斷開連線而未成功加入房間
    if room_id.is_empty() || player_name.is_empty() {
        info!("連線已中斷 (未成功加入房間)");
        return;
    }

    // 2. 第二階段：取得或創建房間狀態並加入玩家
    let tx;
    {
        let mut db = state.db.write().await;
        let room = db.entry(room_id.clone()).or_insert_with(|| {
            info!("房間 {} 不存在，建立新房間", room_id);
            let (tx, _) = broadcast::channel(100);
            Room {
                state: RoomState {
                    room_id: room_id.clone(),
                    stage: GameStage::Lobby,
                    players: Vec::new(),
                },
                tx,
            }
        });

        // 建立新玩家物件
        let new_player = Player {
            id: player_id.clone(),
            name: player_name.clone(),
            is_alive: true,
            is_storyteller: room.state.players.is_empty(), // 房間的第一個加入者自動為說書人
            role: None,
        };

        room.state.players.push(new_player);
        tx = room.tx.clone();

        info!(
            "玩家 {} (ID: {}) 成功加入房間 {}, 是否為說書人: {}",
            player_name, player_id, room_id, room.state.players.last().unwrap().is_storyteller
        );

        // 廣播加入事件與最新房間狀態
        let _ = room.tx.send(GameMessage::PlayerJoined {
            player_name: player_name.clone(),
        });
        let _ = room.tx.send(GameMessage::RoomUpdated(room.state.clone()));
    }

    // 3. 第三階段：雙向異步消息循環
    let mut rx = tx.subscribe();

    // 寫入循環：將房間廣播的消息寫入該 WebSocket
    let mut send_task = tokio::spawn(async move {
        while let Ok(msg) = rx.recv().await {
            if let Ok(serialized) = serde_json::to_string(&msg) {
                if ws_sender.send(Message::Text(serialized)).await.is_err() {
                    break;
                }
            }
        }
    });

    // 讀取循環：接收此 WebSocket 連線發出的動作並處理
    let db_clone = state.db.clone();
    let room_id_clone = room_id.clone();
    let player_name_clone = player_name.clone();
    let player_name_for_recv = player_name.clone(); // 💡 專門給 recv_task 借用
    let tx_clone = tx.clone();

    let mut recv_task = tokio::spawn(async move {
        while let Some(Ok(msg)) = ws_receiver.next().await {
            if let Message::Text(text) = msg {
                debug!("收到玩家 {} 訊息: {}", player_name_for_recv, text);
                if let Ok(game_msg) = serde_json::from_str::<GameMessage>(&text) {
                    match game_msg {
                        GameMessage::SendMessage { message } => {
                            let chat_msg = GameMessage::ChatMessage {
                                sender_name: player_name_for_recv.clone(),
                                message,
                            };
                            let _ = tx_clone.send(chat_msg);
                        }
                        _ => {
                            debug!("收到未處理遊戲訊息: {:?}", game_msg);
                        }
                    }
                }
            }
        }
    });

    // 等待任一任務結束 (通常是連線中斷)
    tokio::select! {
        _ = (&mut send_task) => recv_task.abort(),
        _ = (&mut recv_task) => send_task.abort(),
    };

    // 4. 第四階段：連線中斷後的資源清理與狀態廣播
    {
        let mut db = db_clone.write().await;
        if let Some(room) = db.get_mut(&room_id_clone) {
            // 從房間名單中移除玩家
            room.state.players.retain(|p| p.id != player_id);
            info!("玩家 {} (ID: {}) 已離開房間 {}", player_name_clone, player_id, room_id_clone);

            if room.state.players.is_empty() {
                // 如果房間沒人了，直接移除房間釋放記憶體
                db.remove(&room_id_clone);
                info!("房間 {} 已無玩家，銷毀房間", room_id_clone);
            } else {
                // 如果房間還有其他人，若離開者是說書人，自動移交說書人權限給下一個玩家
                let has_storyteller = room.state.players.iter().any(|p| p.is_storyteller);
                if !has_storyteller && !room.state.players.is_empty() {
                    room.state.players[0].is_storyteller = true;
                    info!("說書人權限自動移交給玩家 {}", room.state.players[0].name);
                }

                // 廣播離開事件與最新房間狀態
                let _ = room.tx.send(GameMessage::PlayerLeft {
                    player_name: player_name_clone,
                });
                let _ = room.tx.send(GameMessage::RoomUpdated(room.state.clone()));
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::http::{header, Request, StatusCode};
    use http_body_util::BodyExt;
    use tower::ServiceExt;

    fn setup_test_state() -> AppState {
        AppState {
            db: Arc::new(RwLock::new(HashMap::new())),
            game_state: Arc::new(RwLock::new(game::GameState::default())),
        }
    }

    #[tokio::test]
    async fn test_health_check_index() {
        let app = create_app(setup_test_state());

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/")
                    .body(axum::body::Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);
        let body = response.into_body().collect().await.unwrap().to_bytes();
        assert_eq!(
            &body[..],
            b"BOTC Game Server with Multi-room support is Running!"
        );
    }

    #[tokio::test]
    async fn test_api_game_action_and_state() {
        let state = setup_test_state();
        let app = create_app(state);

        // 1. 測試 add_player Action
        let add_req_body = serde_json::json!({
            "cmd": "add_player",
            "args": { "name": "小明" }
        }).to_string();

        let res = app
            .clone()
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/api/game/action")
                    .header(header::CONTENT_TYPE, "application/json")
                    .body(axum::body::Body::from(add_req_body))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(res.status(), StatusCode::OK);
        let body = res.into_body().collect().await.unwrap().to_bytes();
        let action_result: serde_json::Value = serde_json::from_slice(&body).unwrap();
        assert_eq!(action_result["players"].as_array().unwrap().len(), 1);
        assert_eq!(action_result["players"][0]["name"], "小明");

        // 2. 測試 GET /api/game/state 取得最新狀態
        let state_res = app
            .oneshot(
                Request::builder()
                    .method("GET")
                    .uri("/api/game/state")
                    .body(axum::body::Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(state_res.status(), StatusCode::OK);
        let state_body = state_res.into_body().collect().await.unwrap().to_bytes();
        let query_result: serde_json::Value = serde_json::from_slice(&state_body).unwrap();
        assert_eq!(query_result["players"].as_array().unwrap().len(), 1);
        assert_eq!(query_result["players"][0]["name"], "小明");
    }
}

