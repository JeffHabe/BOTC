use axum::{
    extract::{ws::{Message, WebSocket, WebSocketUpgrade}, State},
    response::IntoResponse,
    routing::get,
    Router,
};
use futures_util::{SinkExt, StreamExt};
use std::collections::HashMap;
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::sync::{broadcast, RwLock};
use tower_http::cors::CorsLayer;
use shared::protocol::{GameMessage, GameStage, Player, RoomState};
use tracing::{debug, info};

// ─── 狀態管理資料結構 ──────────────────────────────────────────

/// 記憶體中的房間結構
pub struct Room {
    pub state: RoomState,
    pub tx: broadcast::Sender<GameMessage>,
}

/// 執行緒安全的房間列表資料庫
pub type Db = Arc<RwLock<HashMap<String, Room>>>;

/// Axum 全域共享狀態
#[derive(Clone)]
pub struct AppState {
    pub db: Db,
}

// ─── 主程式進入點 ──────────────────────────────────────────────

#[tokio::main]
async fn main() {
    // 初始化日誌訂閱器
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()),
        )
        .init();

    // 建立全域資料庫
    let state = AppState {
        db: Arc::new(RwLock::new(HashMap::new())),
    };

    let cors = CorsLayer::permissive();

    // 將狀態注入路由中
    let app = Router::new()
        .route("/", get(index))
        .route("/ws", get(ws_handler))
        .with_state(state)
        .layer(cors);

    let addr = SocketAddr::from(([127, 0, 0, 1], 3030));
    info!("BOTC 遊戲伺服器已啟動，監聽 http://{}", addr);

    let listener = tokio::net::TcpListener::bind(&addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

async fn index() -> &'static str {
    "BOTC Game Server with Multi-room support is Running!"
}

async fn ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_socket(socket, state))
}

// ─── WebSocket 連線生命週期管理 ──────────────────────────────

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
