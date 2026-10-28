//! ─── BOTC 魔典伺服器核心遊戲狀態與命令派發器 ─────────────────────────
//! 
//! 本模組負責：
//! 1. 定義與前端魔典完全對齊的遊戲資料結構 (GameState, Player, Script, CharacterDef 等)
//! 2. 實作統一命令派發函數 `execute_action`，解析前端 HTTP/WebSocket 請求並安全修改伺服器記憶體狀態

use chrono::Utc;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use uuid::Uuid;

// ─── 角色類型 ────────────────────────────────────────────────

/// 角色所屬陣營/類型
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum RoleType {
    /// 鎮民 (善良陣營主要力量)
    #[serde(alias = "townsfolk", alias = "Townsfolk")]
    Townsfolk,
    /// 外來者 (善良陣營但帶有負面干擾能力)
    #[serde(alias = "outsider", alias = "Outsider")]
    Outsider,
    /// 爪牙 (邪惡陣營輔助角色)
    #[serde(alias = "minion", alias = "Minion")]
    Minion,
    /// 惡魔 (邪惡陣營核心，被處決則善良獲勝)
    #[serde(alias = "demon", alias = "Demon")]
    Demon,
    /// 旅行者 (晚加入或隨時可退出的特殊角色)
    #[serde(alias = "traveler", alias = "Traveler")]
    Traveler,
    /// 傳說角色 (全域規則調整器)
    #[serde(alias = "fabled", alias = "Fabled")]
    Fabled,
    /// 奇遇角色 (官方自訂擴充)
    #[serde(alias = "loric", alias = "Loric")]
    Loric,
}

// ─── 提醒令牌 ────────────────────────────────────────────────

/// 標記在玩家座位上的提醒令牌 (Reminder Token)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReminderToken {
    /// 令牌唯一標識 ID (UUID v4)
    pub id: String,
    /// 令牌文字描述 (例如 "中毒", "已死亡", "保護中")
    pub text: String,
    /// 來源角色代碼 (由哪一位角色的技能所放置)
    pub source_role: String,
    /// 放置時的輪次 (Day / Round N)
    pub round: u32,
}

impl ReminderToken {
    /// 建立新的提醒令牌實例
    /// - `text`: 提醒文字
    /// - `source_role`: 觸發該標記的角色 ID
    /// - `round`: 標記建立當下的遊戲輪次
    pub fn new(text: &str, source_role: &str, round: u32) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            text: text.to_string(),
            source_role: source_role.to_string(),
            round,
        }
    }
}

// ─── 角色定義 ────────────────────────────────────────────────

/// 角色詳細定義結構 (對應劇本的角色資料庫)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CharacterDef {
    /// 角色唯一識別代碼 (如 "washerwoman", "imp")
    pub id: String,
    /// 角色中文名稱 (如 "洗衣婦", "小惡魔")
    pub name: String,
    /// 角色英文名稱 (如 "Washerwoman", "Imp")
    pub name_en: String,
    /// 角色所屬陣營類型
    pub role_type: RoleType,
    /// 角色技能描述文字
    pub ability: String,
    /// 角色背景故事與風味文字
    pub flavor: Option<String>,
    /// 第一夜行動順序權重 (數值越小越早喚醒)
    pub night_order_first: Option<f64>,
    /// 其他夜晚行動順序權重 (數值越小越早喚醒)
    pub night_order_other: Option<f64>,
    /// 該角色專屬的提醒令牌清單
    #[serde(default)]
    pub reminders: Vec<String>,
    /// 全域提醒標籤清單
    #[serde(default)]
    pub reminders_global: Vec<String>,
    /// 是否影響開局配置 (例如改變外來者數量)
    #[serde(default)]
    pub setup: bool,
    /// 角色圖標 URL 或相對路徑
    pub image: Option<String>,
    /// 首夜說書人提示備忘文字
    pub first_night_reminder: Option<String>,
    /// 其他夜晚說書人提示備忘文字
    pub other_night_reminder: Option<String>,
    /// 與此角色發生衝突或相剋的規則說明
    #[serde(default)]
    pub conflicts: Vec<String>,
    /// 角色分類/官方擴充包標籤
    pub class: Option<String>,
}

// ─── 玩家 ────────────────────────────────────────────────────

/// 座位上的單一玩家狀態
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Player {
    /// 玩家唯一識別 ID (UUID v4)
    pub id: String,
    /// 玩家自訂暱稱 (例如 "小明", "玩家 1")
    pub name: String,
    /// 圓桌座位號碼 (1 ~ N，順時針編號)
    pub seat: u32,
    /// 說書人所發放的實際角色卡 (未發放前為 None)
    pub role: Option<CharacterDef>,
    /// 存活狀態 (true: 存活, false: 死亡)
    pub is_alive: bool,
    /// 鬼魂投票標記 (死者是否還持有一張幽靈票)
    pub has_ghost_vote: bool,
    /// 當前放置在該玩家身上的提醒令牌列表
    pub reminders: Vec<ReminderToken>,
    /// 今日白天是否已經被其他人提名過
    pub is_nominated: bool,
    /// 今日白天是否還具備發起提名的資格
    pub can_nominate: bool,
    /// 額外提名次數 (如報喪女妖技能)
    #[serde(default)]
    pub extra_nominations: u32,
    /// 額外投票次數 (如報喪女妖技能)
    #[serde(default)]
    pub extra_votes: u32,
    /// 說書人私有便條筆記 (自訂備註)
    #[serde(default)]
    pub notes: String,
}

impl Player {
    /// 建立全新玩家座位
    /// - `name`: 玩家名稱
    /// - `seat`: 座位順序編號 (從 1 開始)
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
            extra_nominations: 0,
            extra_votes: 0,
            notes: String::new(),
        }
    }
}

fn make_player_dead(p: &mut Player) {
    p.is_alive = false;
    if let Some(ref r) = p.role {
        if r.id == "banshee" {
            p.can_nominate = true;
            p.extra_nominations = 1;
            p.extra_votes = 1;
        }
    }
}

// ─── 劇本 ────────────────────────────────────────────────────

/// 魔典載入之劇本結構
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Script {
    /// 劇本 ID (例如 "trouble_brewing", "all_character_sort")
    pub id: String,
    /// 劇本名稱 (例如 "暗流湧動", "災禍滋生")
    pub name: String,
    /// 劇本作者名稱
    pub author: Option<String>,
    /// 劇本所包含的角色清單
    pub characters: Vec<CharacterDef>,
    /// 劇本分類 (例如 "官方劇本", "自訂劇本")
    pub category: Option<String>,
    /// 自訂第一夜行動順序覆寫列表 (角色 ID 排列)
    pub custom_first_night_order: Option<Vec<String>>,
    /// 自訂其他夜晚行動順序覆寫列表 (角色 ID 排列)
    pub custom_other_night_order: Option<Vec<String>>,
}

impl Script {
    /// 建立預設空劇本實例
    pub fn empty() -> Self {
        Self {
            id: "all_character_sort".to_string(),
            name: "全角色大全".to_string(),
            author: None,
            characters: Vec::new(),
            category: None,
            custom_first_night_order: None,
            custom_other_night_order: None,
        }
    }
}

// ─── 遊戲階段 ─────────────────────────────────────────────────

/// 遊戲當前所處的階段
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum GamePhase {
    /// 準備階段 (建立玩家、發放身分、挑選劇本)
    Setup,
    /// 第一個夜晚 (確認身分、資訊發放)
    FirstNight,
    /// 白天 (自由討論、發起提名、公開處決)
    Day,
    /// 後續夜晚 (各角色發動技能行動)
    Night,
}

// ─── 提名 ────────────────────────────────────────────────────

/// 白天投票環節之單次提名紀錄
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Nomination {
    /// 發起提名的玩家 ID
    pub nominator_id: String,
    /// 被提名的目標玩家 ID
    pub nominee_id: String,
    /// 投贊成票的玩家 ID 列表
    pub votes_for: Vec<String>,
    /// 執行處決所需達到的門檻票數 (當前存活玩家半數)
    pub threshold: u32,
    /// 今日是否已由此提名確定處決
    pub executed: bool,
    /// 提名發起的遊戲輪次 (Day N)
    #[serde(default)]
    pub round: u32,
    /// 額外加減票數修正 (由角色技能或說書人調整)
    #[serde(default)]
    pub extra_votes: i32,
}

// ─── 主遊戲狀態 ───────────────────────────────────────────────

/// 魔典 (Grimoire) 核心完整狀態機
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameState {
    /// 對局識別 ID (UUID v4)
    pub id: String,
    /// 當前裝載的劇本
    pub script: Script,
    /// 當前桌上的所有玩家
    pub players: Vec<Player>,
    /// 當前遊戲階段
    pub phase: GamePhase,
    /// 當前天數/輪次計數 (Day 1, Night 1, ...)
    pub round: u32,
    /// 惡魔偽裝身分 (Demon Bluffs, 官方標準通常為 3 個)
    pub demon_bluffs: Vec<Option<CharacterDef>>,
    /// 瘋子偽裝身分 (Lunatic Bluffs, 最多 3 個)
    #[serde(default)]
    pub lunatic_bluffs: Vec<Option<CharacterDef>>,
    /// 當天白天的所有提名記錄
    pub nominations: Vec<Nomination>,
    /// 當前對局啟用的傳說角色 ID 清單
    #[serde(default)]
    pub active_fabled: Vec<String>,
    /// 遊戲進行歷程日誌
    #[serde(default)]
    pub game_logs: Vec<Value>,
    /// 遊戲建立時間 (RFC3339 格式)
    pub created_at: String,
    /// 最後更新時間 (RFC3339 格式)
    pub updated_at: String,
}

impl Default for GameState {
    /// 建立一局全新的預設魔典對局狀態
    fn default() -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            script: Script::empty(),
            players: Vec::new(),
            phase: GamePhase::FirstNight,
            round: 1,
            demon_bluffs: vec![None, None, None],
            lunatic_bluffs: vec![None, None, None],
            nominations: Vec::new(),
            active_fabled: Vec::new(),
            game_logs: Vec::new(),
            created_at: Utc::now().to_rfc3339(),
            updated_at: Utc::now().to_rfc3339(),
        }
    }
}

impl GameState {
    /// 更新最後異動時間戳記
    pub fn touch(&mut self) {
        self.updated_at = Utc::now().to_rfc3339();
    }

    /// 計算目前存活玩家人數
    pub fn alive_count(&self) -> usize {
        self.players.iter().filter(|p| p.is_alive).count()
    }

    /// 計算今日處決目標所需的半數門檻票數
    pub fn execution_threshold(&self) -> u32 {
        ((self.alive_count() as f32 / 2.0).ceil()) as u32
    }
}

// ─── 統一命令派發執行器 ────────────────────────────────────────

/// 核心命令派發器 (Command Dispatcher)
/// 
/// 目的：
/// 接收前端 `safeInvoke` 發送的指令字串與參數，對後端 `GameState` 實施安全狀態轉變。
/// 
/// 參數說明：
/// - `gs`  : 當前魔典的可變引用 (Mutable Reference)
/// - `cmd` : 指令識別碼 (字串)
/// - `args`: JSON 格式的指令參數物件
/// 
/// 回傳值：
/// - `Ok(Value)`: 執行成功，通常回傳更新後的 `GameState` JSON 或結果物件
/// - `Err(String)`: 執行失敗並附帶具體錯誤訊息
pub fn execute_action(gs: &mut GameState, cmd: &str, args: Value) -> Result<Value, String> {
    match cmd {
        // ─── 1. 遊戲基礎管理 ────────────────────────────────────

        // 取得完整遊戲狀態 (無額外參數)
        "get_game_state" | "load_game_state" => {
            serde_json::to_value(&*gs).map_err(|e| e.to_string())
        }

        // 儲存或還原該說書人的完整遊戲狀態
        // 參數: { "state": GameState }
        "save_game_state" => {
            if let Some(state_val) = args.get("state") {
                if let Ok(restored) = serde_json::from_value::<GameState>(state_val.clone()) {
                    *gs = restored;
                    gs.touch();
                }
            }
            serde_json::to_value(&*gs).map_err(|e| e.to_string())
        }

        // 開始新遊戲 (重置所有狀態與名單為全新預設值)
        "new_game" => {
            *gs = GameState::default();
            serde_json::to_value(&*gs).map_err(|e| e.to_string())
        }

        // 重置玩家狀態 (保留座位名單與名稱，清空角色與標記，重返首夜)
        "reset_players_state" => {
            gs.phase = GamePhase::FirstNight;
            gs.round = 1;
            gs.nominations.clear();
            gs.demon_bluffs = vec![None, None, None];
            gs.lunatic_bluffs = vec![None, None, None];
            for p in gs.players.iter_mut() {
                p.role = None;
                p.is_alive = true;
                p.has_ghost_vote = true;
                p.reminders.clear();
                p.is_nominated = false;
                p.can_nominate = true;
            }
            gs.touch();
            serde_json::to_value(&*gs).map_err(|e| e.to_string())
        }

        // 設定或更換當前劇本
        // 參數: { "script": Script }
        "set_script" => {
            if let Some(script_val) = args.get("script") {
                let script: Script = serde_json::from_value(script_val.clone())
                    .map_err(|e| format!("無效的劇本資料: {}", e))?;
                gs.script = script;
                gs.touch();
            }
            serde_json::to_value(&*gs).map_err(|e| e.to_string())
        }

        // ─── 2. 玩家管理 ────────────────────────────────────────

        // 在座位尾端新增一名玩家 (最多支援 20 人)
        // 參數: { "name": "玩家姓名" }
        "add_player" => {
            let name = args.get("name")
                .and_then(|v| v.as_str())
                .unwrap_or("新玩家");
            if gs.players.len() >= 20 {
                return Err("最多支援 20 名玩家".to_string());
            }
            let seat = (gs.players.len() + 1) as u32;
            gs.players.push(Player::new(name, seat));
            gs.touch();
            serde_json::to_value(&*gs).map_err(|e| e.to_string())
        }

        // 快速設定玩家人數 (自動補齊空座位至指定數量)
        // 參數: { "count": 12 }
        "set_player_count" => {
            let count = args.get("count")
                .and_then(|v| v.as_u64())
                .unwrap_or(0) as u32;
            if count > 20 {
                return Err("最多支援 20 名玩家".to_string());
            }
            let current = gs.players.len() as u32;
            if count > current {
                for i in 0..(count - current) {
                    let seat = current + i + 1;
                    gs.players.push(Player::new("空座位", seat));
                }
            }
            gs.touch();
            serde_json::to_value(&*gs).map_err(|e| e.to_string())
        }

        // 刪除指定玩家並重新編排剩餘座號
        // 參數: { "player_id": "uuid" }
        "remove_player" => {
            let player_id = args.get("player_id")
                .or_else(|| args.get("playerId"))
                .and_then(|v| v.as_str())
                .unwrap_or("");
            gs.players.retain(|p| p.id != player_id);
            for (i, p) in gs.players.iter_mut().enumerate() {
                p.seat = (i + 1) as u32;
            }
            gs.touch();
            serde_json::to_value(&*gs).map_err(|e| e.to_string())
        }

        // 修改指定玩家姓名
        // 參數: { "player_id": "uuid", "new_name": "新名稱" }
        "rename_player" => {
            let player_id = args.get("player_id")
                .or_else(|| args.get("playerId"))
                .and_then(|v| v.as_str())
                .unwrap_or("");
            let new_name = args.get("new_name")
                .or_else(|| args.get("newName"))
                .and_then(|v| v.as_str())
                .unwrap_or("");
            if let Some(p) = gs.players.iter_mut().find(|p| p.id == player_id) {
                p.name = new_name.to_string();
                gs.touch();
            }
            serde_json::to_value(&*gs).map_err(|e| e.to_string())
        }

        // 交換兩名玩家的圓桌座位順序
        // 參數: { "player_id_a": "id1", "player_id_b": "id2" }
        "swap_seats" => {
            let id_a = args.get("player_id_a").or_else(|| args.get("playerIdA")).and_then(|v| v.as_str()).unwrap_or("");
            let id_b = args.get("player_id_b").or_else(|| args.get("playerIdB")).and_then(|v| v.as_str()).unwrap_or("");
            let pos_a = gs.players.iter().position(|p| p.id == id_a);
            let pos_b = gs.players.iter().position(|p| p.id == id_b);
            if let (Some(pa), Some(pb)) = (pos_a, pos_b) {
                let seat_a = gs.players[pa].seat;
                let seat_b = gs.players[pb].seat;
                gs.players[pa].seat = seat_b;
                gs.players[pb].seat = seat_a;
                gs.players.swap(pa, pb);
                gs.touch();
            }
            serde_json::to_value(&*gs).map_err(|e| e.to_string())
        }

        // ─── 3. 角色指派與身份管理 ──────────────────────────────

        // 為單一玩家指派身分卡 (傳 null 則為移除身分)
        // 參數: { "player_id": "uuid", "role": CharacterDef | null }
        "assign_role" => {
            let player_id = args.get("player_id").or_else(|| args.get("playerId")).and_then(|v| v.as_str()).unwrap_or("");
            let role_val = args.get("role");
            let role: Option<CharacterDef> = match role_val {
                Some(v) if !v.is_null() => serde_json::from_value(v.clone()).ok(),
                _ => None,
            };
            if let Some(p) = gs.players.iter_mut().find(|p| p.id == player_id) {
                p.role = role;
                gs.touch();
            }
            serde_json::to_value(&*gs).map_err(|e| e.to_string())
        }

        // 批量為多名玩家指派身分
        // 參數: { "assignments": [{ "player_id": "id", "role": CharacterDef }] }
        "bulk_assign_roles" => {
            if let Some(arr) = args.get("assignments").and_then(|v| v.as_array()) {
                for item in arr {
                    let pid = item.get("player_id").or_else(|| item.get("playerId")).and_then(|v| v.as_str()).unwrap_or("");
                    let r_val = item.get("role");
                    let role: Option<CharacterDef> = match r_val {
                        Some(v) if !v.is_null() => serde_json::from_value(v.clone()).ok(),
                        _ => None,
                    };
                    if let Some(p) = gs.players.iter_mut().find(|p| p.id == pid) {
                        p.role = role;
                    }
                }
                gs.touch();
            }
            serde_json::to_value(&*gs).map_err(|e| e.to_string())
        }

        // ─── 4. 生死狀態與投票權利 ──────────────────────────────

        // 將玩家標記為死亡 (保留幽靈票)
        // 參數: { "player_id": "uuid" }
        "kill_player" => {
            let player_id = args.get("player_id").or_else(|| args.get("playerId")).and_then(|v| v.as_str()).unwrap_or("");
            if let Some(p) = gs.players.iter_mut().find(|p| p.id == player_id) {
                make_player_dead(p);
                gs.touch();
            }
            serde_json::to_value(&*gs).map_err(|e| e.to_string())
        }

        // 復活指定玩家
        // 參數: { "player_id": "uuid" }
        "revive_player" => {
            let player_id = args.get("player_id").or_else(|| args.get("playerId")).and_then(|v| v.as_str()).unwrap_or("");
            if let Some(p) = gs.players.iter_mut().find(|p| p.id == player_id) {
                p.is_alive = true;
                p.has_ghost_vote = true;
                p.extra_nominations = 0;
                p.extra_votes = 0;
                gs.touch();
            }
            serde_json::to_value(&*gs).map_err(|e| e.to_string())
        }

        // 消耗死者的幽靈票 (標記已投票)
        // 參數: { "player_id": "uuid" }
        "use_ghost_vote" => {
            let player_id = args.get("player_id").or_else(|| args.get("playerId")).and_then(|v| v.as_str()).unwrap_or("");
            if let Some(p) = gs.players.iter_mut().find(|p| p.id == player_id) {
                p.has_ghost_vote = false;
                gs.touch();
            }
            serde_json::to_value(&*gs).map_err(|e| e.to_string())
        }

        // 切換死者幽靈票的持有狀態
        // 參數: { "player_id": "uuid" }
        "toggle_ghost_vote" => {
            let player_id = args.get("player_id").or_else(|| args.get("playerId")).and_then(|v| v.as_str()).unwrap_or("");
            if let Some(p) = gs.players.iter_mut().find(|p| p.id == player_id) {
                p.has_ghost_vote = !p.has_ghost_vote;
                gs.touch();
            }
            serde_json::to_value(&*gs).map_err(|e| e.to_string())
        }

        // 切換玩家今日提名資格 (是否還能提名別人)
        // 參數: { "player_id": "uuid" }
        "toggle_can_nominate" => {
            let player_id = args.get("player_id").or_else(|| args.get("playerId")).and_then(|v| v.as_str()).unwrap_or("");
            if let Some(p) = gs.players.iter_mut().find(|p| p.id == player_id) {
                p.can_nominate = !p.can_nominate;
                gs.touch();
            }
            serde_json::to_value(&*gs).map_err(|e| e.to_string())
        }

        // ─── 5. 遊戲階段推進 ────────────────────────────────────

        // 直接設定遊戲階段
        // 參數: { "phase": "Setup" | "FirstNight" | "Day" | "Night" }
        "set_phase" => {
            if let Some(phase_val) = args.get("phase") {
                if let Ok(ph) = serde_json::from_value::<GamePhase>(phase_val.clone()) {
                    gs.phase = ph;
                    gs.touch();
                }
            }
            serde_json::to_value(&*gs).map_err(|e| e.to_string())
        }

        // 順向推進至下一階段 (Setup -> FirstNight -> Day -> Night -> Day ...)
        // 參數: 無
        "advance_phase" => {
            match gs.phase {
                GamePhase::Setup => {
                    gs.round = 1;
                    gs.phase = GamePhase::FirstNight;
                }
                GamePhase::FirstNight => gs.phase = GamePhase::Day,
                GamePhase::Day => {
                    gs.phase = GamePhase::Night;
                    gs.round += 1;
                    for p in gs.players.iter_mut() {
                        p.is_nominated = false;
                        if p.is_alive {
                            p.can_nominate = true;
                        }
                    }
                }
                GamePhase::Night => gs.phase = GamePhase::Day,
            }
            gs.touch();
            serde_json::to_value(&*gs).map_err(|e| e.to_string())
        }

        // 逆向回退至上一階段
        // 參數: 無
        "revert_phase" => {
            match gs.phase {
                GamePhase::Night => gs.phase = GamePhase::Day,
                GamePhase::Day if gs.round > 1 => {
                    gs.phase = GamePhase::Night;
                    gs.round -= 1;
                }
                GamePhase::Day => gs.phase = GamePhase::FirstNight,
                GamePhase::FirstNight => gs.phase = GamePhase::Setup,
                GamePhase::Setup => {}
            }
            gs.touch();
            serde_json::to_value(&*gs).map_err(|e| e.to_string())
        }

        // ─── 6. 提醒標記 (Reminders) ────────────────────────────

        // 為玩家新增提醒標籤
        // 參數: { "player_id": "uuid", "text": "標記文字", "source_role": "角色ID" }
        "add_reminder" => {
            let player_id = args.get("player_id").or_else(|| args.get("playerId")).and_then(|v| v.as_str()).unwrap_or("");
            let text = args.get("text").and_then(|v| v.as_str()).unwrap_or("");
            let source_role = args.get("source_role").or_else(|| args.get("sourceRole")).and_then(|v| v.as_str()).unwrap_or("");
            if let Some(p) = gs.players.iter_mut().find(|p| p.id == player_id) {
                p.reminders.push(ReminderToken::new(text, source_role, gs.round));
                gs.touch();
            }
            serde_json::to_value(&*gs).map_err(|e| e.to_string())
        }

        // 移除玩家身上的指定提醒標籤
        // 參數: { "player_id": "uuid", "reminder_id": "標籤UUID" }
        "remove_reminder" => {
            let player_id = args.get("player_id").or_else(|| args.get("playerId")).and_then(|v| v.as_str()).unwrap_or("");
            let reminder_id = args.get("reminder_id").or_else(|| args.get("reminderId")).and_then(|v| v.as_str()).unwrap_or("");
            if let Some(p) = gs.players.iter_mut().find(|p| p.id == player_id) {
                p.reminders.retain(|r| r.id != reminder_id);
                gs.touch();
            }
            serde_json::to_value(&*gs).map_err(|e| e.to_string())
        }

        // ─── 7. 提名與投票 ──────────────────────────────────────

        // 白天發起提名 (自動計算門檻票數並鎖定當日提名/被提名旗標)
        // 參數: { "nominator_id": "提名者ID", "nominee_id": "被提名者ID" }
        "nominate" => {
            let nominator_id = args.get("nominator_id").or_else(|| args.get("nominatorId")).and_then(|v| v.as_str()).unwrap_or("");
            let nominee_id = args.get("nominee_id").or_else(|| args.get("nomineeId")).and_then(|v| v.as_str()).unwrap_or("");
            let threshold = gs.execution_threshold();
            gs.nominations.push(Nomination {
                nominator_id: nominator_id.to_string(),
                nominee_id: nominee_id.to_string(),
                votes_for: Vec::new(),
                threshold,
                executed: false,
                round: gs.round,
                extra_votes: 0,
            });
            if let Some(p) = gs.players.iter_mut().find(|p| p.id == nominator_id) {
                if p.extra_nominations > 0 {
                    p.extra_nominations -= 1;
                } else {
                    p.can_nominate = false;
                }
            }
            if let Some(p) = gs.players.iter_mut().find(|p| p.id == nominee_id) {
                p.is_nominated = true;
            }
            gs.touch();
            serde_json::to_value(&*gs).map_err(|e| e.to_string())
        }

        // 修改當日尚未處決的提名
        // 參數: { "nomination_index": 0, "new_nominator_id": "ID", "new_nominee_id": "ID" }
        "edit_nomination" => {
            let nomination_index = args.get("nomination_index").or_else(|| args.get("nominationIndex")).and_then(|v| v.as_u64()).unwrap_or(0) as usize;
            let new_nominator_id = args.get("new_nominator_id").or_else(|| args.get("newNominatorId")).and_then(|v| v.as_str()).unwrap_or("");
            let new_nominee_id = args.get("new_nominee_id").or_else(|| args.get("newNomineeId")).and_then(|v| v.as_str()).unwrap_or("");

            let current_round = gs.round;
            let (old_nominator_id, old_nominee_id) = {
                let nom = gs.nominations.get(nomination_index).ok_or("找不到指定提名")?;
                if nom.executed {
                    return Err("已執行的提名無法修改".into());
                }
                if nom.round != current_round {
                    return Err("只能修改當日的提名".into());
                }
                (nom.nominator_id.clone(), nom.nominee_id.clone())
            };

            if let Some(p) = gs.players.iter_mut().find(|p| p.id == old_nominator_id) {
                p.can_nominate = true;
            }
            if let Some(p) = gs.players.iter_mut().find(|p| p.id == old_nominee_id) {
                p.is_nominated = false;
            }

            let mut valid = true;
            let mut err_msg = "";

            if let Some(nominator) = gs.players.iter().find(|p| p.id == new_nominator_id) {
                if !nominator.can_nominate {
                    valid = false;
                    err_msg = "該提名者今日已發起過提名";
                }
            } else {
                valid = false;
                err_msg = "找不到提名者";
            }

            if valid {
                if let Some(nominee) = gs.players.iter().find(|p| p.id == new_nominee_id) {
                    if nominee.is_nominated {
                        valid = false;
                        err_msg = "該被提名者今日已被提名過";
                    }
                } else {
                    valid = false;
                    err_msg = "找不到被提名者";
                }
            }

            if !valid {
                if let Some(p) = gs.players.iter_mut().find(|p| p.id == old_nominator_id) {
                    p.can_nominate = false;
                }
                if let Some(p) = gs.players.iter_mut().find(|p| p.id == old_nominee_id) {
                    p.is_nominated = true;
                }
                return Err(err_msg.into());
            }

            if let Some(p) = gs.players.iter_mut().find(|p| p.id == new_nominator_id) {
                p.can_nominate = false;
            }
            if let Some(p) = gs.players.iter_mut().find(|p| p.id == new_nominee_id) {
                p.is_nominated = true;
            }

            if let Some(nom) = gs.nominations.get_mut(nomination_index) {
                nom.nominator_id = new_nominator_id.to_string();
                nom.nominee_id = new_nominee_id.to_string();
            }

            gs.touch();
            serde_json::to_value(&*gs).map_err(|e| e.to_string())
        }

        // 撤銷或刪除指定索引的提名記錄並歸還提名/被提/死亡票權利
        // 參數: { "nomination_index": 0 } 或 { "index": 0 }
        "remove_nomination" => {
            let index = args.get("nomination_index")
                .or_else(|| args.get("nominationIndex"))
                .or_else(|| args.get("index"))
                .and_then(|v| v.as_u64())
                .unwrap_or(0) as usize;
            if index < gs.nominations.len() {
                let nom = &gs.nominations[index];
                if nom.executed {
                    return Err("已執行的提名無法取消，請先撤銷處決".into());
                }
                let nominator_id = nom.nominator_id.clone();
                let nominee_id = nom.nominee_id.clone();
                let voters = nom.votes_for.clone();

                if let Some(p) = gs.players.iter_mut().find(|p| p.id == nominator_id) {
                    p.can_nominate = true;
                }
                if let Some(p) = gs.players.iter_mut().find(|p| p.id == nominee_id) {
                    p.is_nominated = false;
                }
                for voter_id in voters {
                    if let Some(p) = gs.players.iter_mut().find(|p| p.id == voter_id) {
                        if !p.is_alive {
                            p.has_ghost_vote = true;
                        }
                    }
                }

                gs.nominations.remove(index);
                gs.touch();
            }
            serde_json::to_value(&*gs).map_err(|e| e.to_string())
        }

        // 調整提名的額外票數
        // 參數: { "nomination_index": 0, "extra_votes": 1 }
        "adjust_extra_votes" => {
            let nomination_idx = args.get("nomination_index").or_else(|| args.get("nominationIndex")).and_then(|v| v.as_u64()).unwrap_or(0) as usize;
            let extra_votes = args.get("extra_votes").or_else(|| args.get("extraVotes")).and_then(|v| v.as_i64()).unwrap_or(0) as i32;
            if let Some(nom) = gs.nominations.get_mut(nomination_idx) {
                nom.extra_votes = extra_votes;
                gs.touch();
            }
            serde_json::to_value(&*gs).map_err(|e| e.to_string())
        }

        // 在當前提名中記錄或切換玩家投票 (支援 Toggle 切換與死亡票扣除/歸還)
        // 參數: { "nomination_index": 0, "voter_id": "投票者ID" } (可選 "in_favor": bool)
        "vote" => {
            let nomination_idx = args.get("nomination_index").or_else(|| args.get("nominationIndex")).and_then(|v| v.as_u64()).unwrap_or(0) as usize;
            let voter_id = args.get("voter_id").or_else(|| args.get("voterId")).and_then(|v| v.as_str()).unwrap_or("");
            let explicit_in_favor = args.get("in_favor").or_else(|| args.get("inFavor")).and_then(|v| v.as_bool());

            let (is_alive, has_ghost_vote, voter_extra_votes) = gs
                .players
                .iter()
                .find(|p| p.id == voter_id)
                .map(|p| (p.is_alive, p.has_ghost_vote, p.extra_votes))
                .unwrap_or((true, false, 0));

            let is_voted = if let Some(nom) = gs.nominations.get(nomination_idx) {
                nom.votes_for.iter().any(|id| id == voter_id)
            } else {
                return Err("找不到指定提名".into());
            };

            let target_vote = explicit_in_favor.unwrap_or(!is_voted);

            if !target_vote && is_voted {
                // 取消投票并歸還死亡玩家投票權
                if !is_alive {
                    if let Some(p) = gs.players.iter_mut().find(|p| p.id == voter_id) {
                        if !p.has_ghost_vote {
                            p.has_ghost_vote = true;
                        } else {
                            p.extra_votes += 1;
                        }
                    }
                }
                if let Some(nom) = gs.nominations.get_mut(nomination_idx) {
                    nom.votes_for.retain(|id| id != voter_id);
                }
                gs.touch();
            } else if target_vote && !is_voted {
                // 投贊成票並扣除死亡玩家投票權
                let has_any_vote = has_ghost_vote || voter_extra_votes > 0;
                if !is_alive && !has_any_vote {
                    return Err("該死亡玩家已無投票權".into());
                }
                if !is_alive {
                    if let Some(p) = gs.players.iter_mut().find(|p| p.id == voter_id) {
                        if p.extra_votes > 0 {
                            p.extra_votes -= 1;
                        } else {
                            p.has_ghost_vote = false;
                        }
                    }
                }
                if let Some(nom) = gs.nominations.get_mut(nomination_idx) {
                    nom.votes_for.push(voter_id.to_string());
                }
                gs.touch();
            }
            serde_json::to_value(&*gs).map_err(|e| e.to_string())
        }

        // 執行行刑處決
        // 參數: { "nomination_index": 0 }
        "execute" => {
            let nomination_index = args.get("nomination_index").or_else(|| args.get("nominationIndex")).and_then(|v| v.as_u64()).unwrap_or(0) as usize;
            let current_round = gs.round;

            let (target_votes, target_threshold) = {
                let nom = gs.nominations.get(nomination_index).ok_or("找不到指定提名")?;
                ((nom.votes_for.len() as i32 + nom.extra_votes).max(0) as usize, gs.execution_threshold())
            };

            if target_votes < target_threshold as usize {
                return Err("票數未達門檻，無法行刑".into());
            }

            let mut max_votes = 0;
            let mut tie_detected = false;

            for nom in gs.nominations.iter().filter(|n| n.round == current_round) {
                let v_count = (nom.votes_for.len() as i32 + nom.extra_votes).max(0) as usize;
                if v_count > max_votes {
                    max_votes = v_count;
                    tie_detected = false;
                } else if v_count == max_votes && v_count > 0 {
                    tie_detected = true;
                }
            }

            if target_votes < max_votes {
                return Err("該提名非當日最高票，無法行刑".into());
            }
            if tie_detected {
                return Err("最高票平手時無法行刑".into());
            }

            if let Some(nom) = gs.nominations.get_mut(nomination_index) {
                nom.executed = true;
                nom.threshold = target_threshold;
                let nominee_id = nom.nominee_id.clone();
                if let Some(p) = gs.players.iter_mut().find(|p| p.id == nominee_id) {
                    if p.is_alive {
                        make_player_dead(p);
                        p.reminders.push(ReminderToken::new("處決", "系統", current_round));
                    }
                }
                gs.touch();
            }
            serde_json::to_value(&*gs).map_err(|e| e.to_string())
        }

        // 撤銷/反悔行刑處決
        // 參數: { "nomination_index": 0 }
        "undo_execution" => {
            let nomination_index = args.get("nomination_index").or_else(|| args.get("nominationIndex")).and_then(|v| v.as_u64()).unwrap_or(0) as usize;
            let current_round = gs.round;
            if let Some(nom) = gs.nominations.get_mut(nomination_index) {
                if !nom.executed {
                    return Err("該提名尚未執行行刑，無法撤銷".into());
                }
                if nom.round != current_round {
                    return Err("僅能撤銷本日的行刑記錄".into());
                }
                nom.executed = false;
                let nominee_id = nom.nominee_id.clone();

                if let Some(p) = gs.players.iter_mut().find(|p| p.id == nominee_id) {
                    let died_from_execution = p.reminders.iter().any(|r| r.text == "處決");
                    if died_from_execution {
                        p.is_alive = true;
                        p.has_ghost_vote = true;
                        p.reminders.retain(|r| r.text != "處決");
                    }
                }
                gs.touch();
            }
            serde_json::to_value(&*gs).map_err(|e| e.to_string())
        }

        // ─── 8. 偽裝身分 (Bluffs) 與傳說角色 ────────────────────

        // 設定惡魔偽裝身分槽位 (通常有 3 槽: 0, 1, 2)
        // 參數: { "slot": 0, "role": CharacterDef | null }
        "set_demon_bluff" => {
            let slot = args.get("slot").or_else(|| args.get("index")).and_then(|v| v.as_u64()).unwrap_or(0) as usize;
            let role_val = args.get("role");
            let role: Option<CharacterDef> = match role_val {
                Some(v) if !v.is_null() => serde_json::from_value(v.clone()).ok(),
                _ => None,
            };
            if slot < gs.demon_bluffs.len() {
                gs.demon_bluffs[slot] = role;
                gs.touch();
            }
            serde_json::to_value(&*gs).map_err(|e| e.to_string())
        }

        // 設定瘋子偽裝身分槽位
        // 參數: { "slot": 0, "role": CharacterDef | null }
        "set_lunatic_bluff" => {
            let slot = args.get("slot").or_else(|| args.get("index")).and_then(|v| v.as_u64()).unwrap_or(0) as usize;
            let role_val = args.get("role");
            let role: Option<CharacterDef> = match role_val {
                Some(v) if !v.is_null() => serde_json::from_value(v.clone()).ok(),
                _ => None,
            };
            if slot < gs.lunatic_bluffs.len() {
                gs.lunatic_bluffs[slot] = role;
                gs.touch();
            }
            serde_json::to_value(&*gs).map_err(|e| e.to_string())
        }

        // 切換傳說角色啟用清單
        // 參數: { "fabled_id": "fabled_character_id" }
        "toggle_fabled" => {
            let fabled_id = args.get("fabled_id").or_else(|| args.get("fabledId")).and_then(|v| v.as_str()).unwrap_or("");
            if let Some(pos) = gs.active_fabled.iter().position(|id| id == fabled_id) {
                gs.active_fabled.remove(pos);
            } else {
                gs.active_fabled.push(fabled_id.to_string());
            }
            gs.touch();
            serde_json::to_value(&*gs).map_err(|e| e.to_string())
        }

        // ─── 9. 輔助與相容指令 ──────────────────────────────────

        // Web 模式下的授權查詢相容回傳
        "check_license" => {
            Ok(json!({
                "status": "Valid",
                "data": {
                    "remaining_days": 999,
                    "expiry_date": "Web版模式",
                    "device_id": "web-server",
                    "is_activated": true
                }
            }))
        }

        // 日誌寫入與背景計時器相容處理 (Web 模式下不拋錯)
        "write_log_file" | "start_background_timer" => {
            Ok(Value::Null)
        }

        // 預設兜底：對於未特別定義的指令安全返回當前狀態，防止客戶端報錯崩潰
        _ => {
            serde_json::to_value(&*gs).map_err(|e| e.to_string())
        }
    }
}
