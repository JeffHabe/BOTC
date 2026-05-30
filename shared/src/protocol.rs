use serde::{Serialize, Deserialize};

/// 玩家在房間中的狀態
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Player {
    pub id: String,
    pub name: String,
    pub is_alive: bool,
    pub is_storyteller: bool,
    pub role: Option<String>,
}

/// 遊戲當前所處的階段
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum GameStage {
    Lobby,
    Setup,
    Day,
    Vote,
    Night,
}

/// 房間的遊戲狀態
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RoomState {
    pub room_id: String,
    pub stage: GameStage,
    pub players: Vec<Player>,
}

/// 前後端通訊的即時訊息協議
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "payload")]
pub enum GameMessage {
    // 玩家發起的動作 (Client -> Server)
    JoinRoom { room_id: String, player_name: String },
    ToggleReady,
    CastVote { target_player_id: String },
    SendMessage { message: String },
    
    // 伺服器廣播的狀態 (Server -> Client)
    RoomUpdated(RoomState),
    SystemMessage(String),
    ChatMessage { sender_name: String, message: String },
    PlayerJoined { player_name: String },
    PlayerLeft { player_name: String },
}
