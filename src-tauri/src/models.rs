use serde::{Deserialize, Serialize};
use uuid::Uuid;

// ─── 角色類型 ────────────────────────────────────────────────
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum RoleType {
    #[serde(alias = "townsfolk", alias = "Townsfolk")]
    Townsfolk, // 鎮民
    #[serde(alias = "outsider", alias = "Outsider")]
    Outsider, // 外來者
    #[serde(alias = "minion", alias = "Minion")]
    Minion, // 爪牙
    #[serde(alias = "demon", alias = "Demon")]
    Demon, // 惡魔
    #[serde(alias = "traveler", alias = "Traveler")]
    Traveler, // 旅行者
    #[serde(alias = "fabled", alias = "Fabled")]
    Fabled, // 傳說
    #[serde(alias = "loric", alias = "Loric")]
    Loric, // 奇遇
}

impl RoleType {
    pub fn label_zh(&self) -> &str {
        match self {
            RoleType::Townsfolk => "鎮民",
            RoleType::Outsider => "外來者",
            RoleType::Minion => "爪牙",
            RoleType::Demon => "惡魔",
            RoleType::Traveler => "旅行者",
            RoleType::Fabled => "傳說",
            RoleType::Loric => "奇遇",
        }
    }
}

// ─── 提醒令牌 ────────────────────────────────────────────────
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReminderToken {
    pub id: String,
    pub text: String,        // 提醒文字
    pub source_role: String, // 來自哪個角色
    pub round: u32,          // 標註在哪一輪創建
}

impl ReminderToken {
    pub fn new(text: &str, source_role: &str, round: u32) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            text: text.to_string(),
            source_role: source_role.to_string(),
            round,
        }
    }
}

// ─── 角色定義（腳本中的角色資料）────────────────────────────
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CharacterDef {
    pub id: String,
    pub name: String,    // 繁體中文名稱
    pub name_en: String, // 英文名稱
    pub role_type: RoleType,
    pub ability: String,                // 能力說明（繁中）
    pub flavor: Option<String>,         // 風味文字
    pub night_order_first: Option<f64>, // 首夜順序（None = 不行動，用f64兼容小數值如3.3）
    pub night_order_other: Option<f64>, // 其他夜順序
    pub reminders: Vec<String>,         // 提供的提醒令牌文字
    pub setup: bool,                    // 是否在準備階段使用
    pub image: Option<String>,          // 圖片路徑或 URL
    pub first_night_reminder: Option<String>,
    pub other_night_reminder: Option<String>,
    #[serde(default)]
    pub conflicts: Vec<ConflictRule>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConflictRule {
    pub target: Option<String>,
    #[serde(rename = "charB")]
    pub char_b: Option<String>,
    pub desc: Option<String>,
}

// ─── 玩家令牌 ─────────────────────────────────────────────────
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Player {
    pub id: String,
    pub name: String,
    pub seat: u32, // 座位編號（1-indexed, 順時針）
    pub role: Option<CharacterDef>,
    pub is_alive: bool,
    pub has_ghost_vote: bool,          // 死亡玩家的最後投票權
    pub reminders: Vec<ReminderToken>, // 附加的提醒令牌
    pub is_nominated: bool,            // 本輪是否被提名
    pub can_nominate: bool,            // 本日是否可提名
}

impl Player {
    pub fn new(name: &str, seat: u32) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            name: name.to_string(),
            seat,
            role: None,
            is_alive: true,
            has_ghost_vote: true,
            reminders: Vec::new(),
            is_nominated: false,
            can_nominate: true,
        }
    }
}

// ─── 腳本資料 ─────────────────────────────────────────────────
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Script {
    pub id: String,
    pub name: String, // 腳本名稱
    pub name_en: Option<String>,
    pub author: Option<String>,
    pub logo: Option<String>, // 腳本圖示路徑
    pub characters: Vec<CharacterDef>,
}

impl Script {
    pub fn empty() -> Self {
        Self {
            id: String::from("custom"),
            name: String::from("自定義腳本"),
            name_en: None,
            author: None,
            logo: None,
            characters: Vec::new(),
        }
    }

    /// 依類型取得角色
    pub fn characters_of_type(&self, role_type: &RoleType) -> Vec<&CharacterDef> {
        self.characters
            .iter()
            .filter(|c| &c.role_type == role_type)
            .collect()
    }

    /// 取得夜晚順序（首夜）
    pub fn first_night_order(&self) -> Vec<&CharacterDef> {
        let mut chars: Vec<&CharacterDef> = self
            .characters
            .iter()
            .filter(|c| c.night_order_first.is_some())
            .collect();
        chars.sort_by(|a, b| {
            a.night_order_first
                .unwrap_or(f64::MAX)
                .partial_cmp(&b.night_order_first.unwrap_or(f64::MAX))
                .unwrap_or(std::cmp::Ordering::Equal)
        });
        chars
    }

    /// 取得夜晚順序（其他夜）
    pub fn other_night_order(&self) -> Vec<&CharacterDef> {
        let mut chars: Vec<&CharacterDef> = self
            .characters
            .iter()
            .filter(|c| c.night_order_other.is_some())
            .collect();
        chars.sort_by(|a, b| {
            a.night_order_other
                .unwrap_or(f64::MAX)
                .partial_cmp(&b.night_order_other.unwrap_or(f64::MAX))
                .unwrap_or(std::cmp::Ordering::Equal)
        });
        chars
    }
}

// ─── 遊戲階段 ─────────────────────────────────────────────────
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum GamePhase {
    Setup,      // 準備中（分配角色）
    FirstNight, // 第一個夜晚
    Day,        // 白天
    Night,      // 夜晚
}

// ─── 提名記錄 ─────────────────────────────────────────────────
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Nomination {
    pub nominator_id: String,   // 提名者 ID
    pub nominee_id: String,     // 被提名者 ID
    pub votes_for: Vec<String>, // 贊成票玩家 ID
    pub threshold: u32,         // 行刑所需票數
    pub executed: bool,
    #[serde(default)]
    pub round: u32, // 哪一輪 (Day N) 發起的
}

// ─── 主遊戲狀態 ───────────────────────────────────────────────
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameState {
    pub id: String,
    pub script: Script,
    pub players: Vec<Player>,
    pub phase: GamePhase,
    pub round: u32,                              // 當前輪次（Day 1, Night 1, ...）
    pub demon_bluffs: Vec<Option<CharacterDef>>, // 惡魔偽裝角色（最多3）
    #[serde(default)]
    pub lunatic_bluffs: Vec<Option<CharacterDef>>, // 瘋子偽裝角色（最多3）
    pub nominations: Vec<Nomination>,            // 本輪提名記錄
    #[serde(default)]
    pub active_fabled: Vec<String>, // 當前啟用的傳說角色 ID
    pub created_at: String,
    pub updated_at: String,
}

impl Default for GameState {
    fn default() -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            script: Script::empty(),
            players: Vec::new(),
            phase: GamePhase::Setup,
            round: 0,
            demon_bluffs: vec![None, None, None],
            lunatic_bluffs: vec![None, None, None],
            nominations: Vec::new(),
            active_fabled: Vec::new(),
            created_at: chrono::Utc::now().to_rfc3339(),
            updated_at: chrono::Utc::now().to_rfc3339(),
        }
    }
}

impl GameState {
    pub fn alive_count(&self) -> usize {
        self.players
            .iter()
            .filter(|p| p.is_alive)
            .collect::<Vec<_>>()
            .len()
    }

    pub fn dead_count(&self) -> usize {
        self.players.len() - self.alive_count()
    }

    /// 計算行刑所需最低票數（存活玩家半數以上）
    pub fn execution_threshold(&self) -> u32 {
        ((self.alive_count() as f32 / 2.0).ceil()) as u32
    }

    pub fn touch(&mut self) {
        self.updated_at = chrono::Utc::now().to_rfc3339();
    }
}
