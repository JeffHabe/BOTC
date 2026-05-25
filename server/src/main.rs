use axum::{
    extract::ws::{Message, WebSocket, WebSocketUpgrade},
    response::IntoResponse,
    routing::get,
    Router,
};
use futures_util::StreamExt;
use shared::protocol::{GameMessage, GameStage, Player, RoomState};
use std::net::SocketAddr;
use tower_http::cors::CorsLayer;
use tracing::{debug, error, info, warn};

#[tokio::main]
async fn main() {
    // 初始化日誌訂閱器，預設輸出 INFO 等級以上的日誌
    // 支援透過環境變數 RUST_LOG 來調整輸出級別 (例如：RUST_LOG=debug cargo run)
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()),
        )
        .init();

    // 允許跨來源請求 (CORS)，方便網頁端與 App 本地調用
    let cors = CorsLayer::permissive();

    let app = Router::new()
        .route("/", get(index))
        .route("/ws", get(ws_handler))
        .layer(cors);

    let addr = SocketAddr::from(([127, 0, 0, 1], 3030));
    info!("BOTC 遊戲伺服器已啟動，監聽 http://{}", addr);

    let listener = tokio::net::TcpListener::bind(&addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

async fn index() -> &'static str {
    "BOTC Game Server is Running!"
}

async fn ws_handler(ws: WebSocketUpgrade) -> impl IntoResponse {
    ws.on_upgrade(handle_socket)
}

async fn handle_socket(mut socket: WebSocket) {
    info!("新玩家已建立 WebSocket 連線");

    // 模擬當前房間的狀態
    let mock_room = RoomState {
        room_id: "8888".to_string(),
        stage: GameStage::Lobby,
        players: vec![Player {
            id: "1".to_string(),
            name: "說書人小明".to_string(),
            is_alive: true,
            is_storyteller: true,
            role: None,
        }],
    };

    // 發送初始系統訊息與房間狀態給新加入的玩家
    let welcome_msg = GameMessage::SystemMessage("歡迎來到血染鐘樓魔典平台！".to_string());
    if let Ok(serialized) = serde_json::to_string(&welcome_msg) {
        let _ = socket.send(Message::Text(serialized)).await;
    }

    let initial_state = GameMessage::RoomUpdated(mock_room);
    if let Ok(serialized) = serde_json::to_string(&initial_state) {
        let _ = socket.send(Message::Text(serialized)).await;
    }

    // 迴圈讀取玩家傳送的訊息
    while let Some(Ok(msg)) = socket.next().await {
        if let Message::Text(text) = msg {
            debug!("收到客戶端訊息: {}", text);

            // 嘗試解析為我們定義的 GameMessage 協議
            match serde_json::from_str::<GameMessage>(&text) {
                Ok(game_msg) => {
                    match game_msg {
                        GameMessage::JoinRoom {
                            room_id,
                            player_name,
                        } => {
                            info!("玩家 {} 請求加入房間 {}", player_name, room_id);
                            // 這裡未來可以加入實際的房間管理與廣播邏輯
                            let ack =
                                GameMessage::SystemMessage(format!("成功加入房間 {}", room_id));
                            if let Ok(res) = serde_json::to_string(&ack) {
                                let _ = socket.send(Message::Text(res)).await;
                            }
                        }
                        _ => {
                            debug!("收到其他遊戲事件: {:?}", game_msg);
                        }
                    }
                }
                Err(err) => {
                    warn!("解析協議失敗，收到非預期訊息格式: {}. 錯誤: {}", text, err);
                }
            }
        }
    }

    info!("玩家連線已中斷");
}
