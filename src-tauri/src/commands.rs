use std::sync::Mutex;
use tauri::State;
#[warn(unused_imports)]
// use uuid::Uuid;

use crate::models::{CharacterDef, GamePhase, GameState, Nomination, Player, ReminderToken, RoleType, Script};
use serde_json::Value;

pub struct AppState(pub Mutex<GameState>);

// ─── 遊戲管理指令 ─────────────────────────────────────────────

/// 取得完整遊戲狀態
#[tauri::command]
pub fn get_game_state(state: State<AppState>) -> GameState {
    state.0.lock().unwrap().clone()
}

/// 重置/新遊戲
#[tauri::command]
pub fn new_game(state: State<AppState>) -> GameState {
    let mut gs = state.0.lock().unwrap();
    *gs = GameState::default();
    gs.clone()
}

/// 重置所有玩家狀態（保留名單）
#[tauri::command]
pub fn reset_players_state(state: State<AppState>) -> GameState {
    let mut gs = state.0.lock().unwrap();
    gs.phase = GamePhase::Setup;
    gs.round = 0;
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
    gs.clone()
}

/// 設定腳本
#[tauri::command]
pub fn set_script(script: Script, state: State<AppState>) -> Result<GameState, String> {
    let mut gs = state.0.lock().unwrap();
    gs.script = script;
    gs.touch();
    Ok(gs.clone())
}

// ─── 玩家管理指令 ────────────────────────────────────────────

/// 切換傳說角色啟用狀態
#[tauri::command]
pub fn toggle_fabled(fabled_id: String, state: State<AppState>) -> Result<GameState, String> {
    let mut gs = state.0.lock().unwrap();
    if let Some(pos) = gs.active_fabled.iter().position(|id| id == &fabled_id) {
        gs.active_fabled.remove(pos);
    } else {
        gs.active_fabled.push(fabled_id);
    }
    gs.touch();
    Ok(gs.clone())
}

/// 新增玩家
#[tauri::command]
pub fn add_player(name: String, state: State<AppState>) -> Result<GameState, String> {
    let mut gs = state.0.lock().unwrap();
    if gs.players.len() >= 20 {
        return Err("最多支援 20 名玩家".into());
    }
    let seat = (gs.players.len() + 1) as u32;
    gs.players.push(Player::new(&name, seat));
    gs.touch();
    Ok(gs.clone())
}

/// 設定玩家人數（補足空白玩家）
#[tauri::command]
pub fn set_player_count(count: u32, state: State<AppState>) -> Result<GameState, String> {
    let mut gs = state.0.lock().unwrap();
    if count > 20 {
        return Err("最多支援 20 名玩家".into());
    }
    
    let current_count = gs.players.len();
    if count > current_count as u32 {
        let to_add = count - current_count as u32;
        for i in 0..to_add {
            let seat = (current_count + i as usize + 1) as u32;
            gs.players.push(Player::new("空白", seat));
        }
    }
    
    gs.touch();
    Ok(gs.clone())
}

/// 移除玩家
#[tauri::command]
pub fn remove_player(player_id: String, state: State<AppState>) -> Result<GameState, String> {
    let mut gs = state.0.lock().unwrap();
    gs.players.retain(|p| p.id != player_id);
    // 重新編排座位號碼
    for (i, p) in gs.players.iter_mut().enumerate() {
        p.seat = (i + 1) as u32;
    }
    gs.touch();
    Ok(gs.clone())
}

/// 重命名玩家
#[tauri::command]
pub fn rename_player(player_id: String, new_name: String, state: State<AppState>) -> Result<GameState, String> {
    let mut gs = state.0.lock().unwrap();
    if let Some(p) = gs.players.iter_mut().find(|p| p.id == player_id) {
        p.name = new_name;
        gs.touch();
        Ok(gs.clone())
    } else {
        Err(format!("找不到玩家 ID: {}", player_id))
    }
}

/// 交換兩個玩家的座位
#[tauri::command]
pub fn swap_seats(player_id_a: String, player_id_b: String, state: State<AppState>) -> Result<GameState, String> {
    let mut gs = state.0.lock().unwrap();
    let pos_a = gs.players.iter().position(|p| p.id == player_id_a);
    let pos_b = gs.players.iter().position(|p| p.id == player_id_b);
    if let (Some(a), Some(b)) = (pos_a, pos_b) {
        // 交換座位號碼
        let seat_a = gs.players[a].seat;
        let seat_b = gs.players[b].seat;
        gs.players[a].seat = seat_b;
        gs.players[b].seat = seat_a;
        gs.players.swap(a, b);
        gs.touch();
        Ok(gs.clone())
    } else {
        Err("無法找到指定玩家".into())
    }
}

/// 重新編排所有玩家順序
#[tauri::command]
pub fn reorder_players(player_ids: Vec<String>, state: State<AppState>) -> Result<GameState, String> {
    let mut gs = state.0.lock().unwrap();
    let mut new_players = Vec::with_capacity(gs.players.len());
    
    // 將順序列表中的玩家按順序取出
    for id in player_ids {
        if let Some(pos) = gs.players.iter().position(|p| p.id == id) {
            let p = gs.players.remove(pos);
            new_players.push(p);
        }
    }
    
    // 如果有沒在列表中的玩家，補回末端
    for p in gs.players.drain(..) {
        new_players.push(p);
    }
    
    // 重新編定座位號碼
    for (i, p) in new_players.iter_mut().enumerate() {
        p.seat = (i + 1) as u32;
    }
    
    gs.players = new_players;
    gs.touch();
    Ok(gs.clone())
}


// ─── 角色指令 ────────────────────────────────────────────────

/// 指派角色給玩家
#[tauri::command]
pub fn assign_role(player_id: String, role: Option<CharacterDef>, state: State<AppState>) -> Result<GameState, String> {
    let mut gs = state.0.lock().unwrap();
    if let Some(p) = gs.players.iter_mut().find(|p| p.id == player_id) {
        p.role = role;
        gs.touch();
        Ok(gs.clone())
    } else {
        Err(format!("找不到玩家 ID: {}", player_id))
    }
}

/// 設定惡魔虛張角色
#[tauri::command]
pub fn set_demon_bluff(index: usize, role: Option<CharacterDef>, state: State<AppState>) -> Result<GameState, String> {
    let mut gs = state.0.lock().unwrap();
    if index >= 3 {
        return Err("虛張索引必須為 0, 1, 或 2".into());
    }
    gs.demon_bluffs[index] = role;
    gs.touch();
    Ok(gs.clone())
}

/// 設定瘋子偽裝角色
#[tauri::command]
pub fn set_lunatic_bluff(index: usize, role: Option<CharacterDef>, state: State<AppState>) -> Result<GameState, String> {
    let mut gs = state.0.lock().unwrap();
    if index >= 3 {
        return Err("虛張索引必須為 0, 1, 或 2".into());
    }
    gs.lunatic_bluffs[index] = role;
    gs.touch();
    Ok(gs.clone())
}

#[derive(serde::Deserialize)]
pub struct RoleAssignment {
    pub player_id: String,
    pub role: Option<CharacterDef>,
}

/// 大量指派角色
#[tauri::command]
pub fn bulk_assign_roles(
    assignments: Vec<RoleAssignment>,
    bluffs: Vec<Option<CharacterDef>>,
    state: State<AppState>
) -> Result<GameState, String> {
    let mut gs = state.0.lock().unwrap();
    
    for a in assignments {
        if let Some(p) = gs.players.iter_mut().find(|p| p.id == a.player_id) {
            p.role = a.role;
        }
    }
    
    // 如果傳入的虛張列表不為空，才更新（保留彈性）
    if !bluffs.is_empty() {
        gs.demon_bluffs = bluffs;
    }
    
    gs.touch();
    Ok(gs.clone())
}

// ─── 提醒令牌指令 ────────────────────────────────────────────

/// 新增提醒令牌到玩家
#[tauri::command]
pub fn add_reminder(player_id: String, text: String, source_role: String, state: State<AppState>) -> Result<GameState, String> {
    let mut gs = state.0.lock().unwrap();
    let current_round = gs.round;
    if let Some(p) = gs.players.iter_mut().find(|p| p.id == player_id) {
        p.reminders.push(ReminderToken::new(&text, &source_role, current_round));
        gs.touch();
        Ok(gs.clone())
    } else {
        Err(format!("找不到玩家 ID: {}", player_id))
    }
}

/// 修改提醒令牌文字
#[tauri::command]
pub fn update_reminder(player_id: String, reminder_id: String, new_text: String, state: State<AppState>) -> Result<GameState, String> {
    let mut gs = state.0.lock().unwrap();
    if let Some(p) = gs.players.iter_mut().find(|p| p.id == player_id) {
        if let Some(r) = p.reminders.iter_mut().find(|r| r.id == reminder_id) {
            r.text = new_text;
            gs.touch();
            Ok(gs.clone())
        } else {
            Err(format!("找不到提醒 ID: {}", reminder_id))
        }
    } else {
        Err(format!("找不到玩家 ID: {}", player_id))
    }
}

/// 移除提醒令牌
#[tauri::command]
pub fn remove_reminder(player_id: String, reminder_id: String, state: State<AppState>) -> Result<GameState, String> {
    let mut gs = state.0.lock().unwrap();
    if let Some(p) = gs.players.iter_mut().find(|p| p.id == player_id) {
        p.reminders.retain(|r| r.id != reminder_id);
        gs.touch();
        Ok(gs.clone())
    } else {
        Err(format!("找不到玩家 ID: {}", player_id))
    }
}

// ─── 死亡/存活指令 ───────────────────────────────────────────

/// 標記玩家死亡
#[tauri::command]
pub fn kill_player(player_id: String, state: State<AppState>) -> Result<GameState, String> {
    let mut gs = state.0.lock().unwrap();
    if let Some(p) = gs.players.iter_mut().find(|p| p.id == player_id) {
        p.is_alive = false;
        gs.touch();
        Ok(gs.clone())
    } else {
        Err(format!("找不到玩家 ID: {}", player_id))
    }
}

/// 復活玩家（撤銷死亡）
#[tauri::command]
pub fn revive_player(player_id: String, state: State<AppState>) -> Result<GameState, String> {
    let mut gs = state.0.lock().unwrap();
    if let Some(p) = gs.players.iter_mut().find(|p| p.id == player_id) {
        p.is_alive = true;
        p.has_ghost_vote = true;
        gs.touch();
        Ok(gs.clone())
    } else {
        Err(format!("找不到玩家 ID: {}", player_id))
    }
}

/// 標記死亡玩家已使用最後投票
#[tauri::command]
pub fn use_ghost_vote(player_id: String, state: State<AppState>) -> Result<GameState, String> {
    let mut gs = state.0.lock().unwrap();
    if let Some(p) = gs.players.iter_mut().find(|p| p.id == player_id) {
        p.has_ghost_vote = false;
        gs.touch();
        Ok(gs.clone())
    } else {
        Err(format!("找不到玩家 ID: {}", player_id))
    }
}

/// 切換幽靈投票權（開/關）
#[tauri::command]
pub fn toggle_ghost_vote(player_id: String, state: State<AppState>) -> Result<GameState, String> {
    let mut gs = state.0.lock().unwrap();
    if let Some(p) = gs.players.iter_mut().find(|p| p.id == player_id) {
        p.has_ghost_vote = !p.has_ghost_vote;
        gs.touch();
        Ok(gs.clone())
    } else {
        Err(format!("找不到玩家 ID: {}", player_id))
    }
}

/// 切換今日可否提名（開/關）
#[tauri::command]
pub fn toggle_can_nominate(player_id: String, state: State<AppState>) -> Result<GameState, String> {
    let mut gs = state.0.lock().unwrap();
    if let Some(p) = gs.players.iter_mut().find(|p| p.id == player_id) {
        p.can_nominate = !p.can_nominate;
        gs.touch();
        Ok(gs.clone())
    } else {
        Err(format!("找不到玩家 ID: {}", player_id))
    }
}

// ─── 遊戲階段指令 ────────────────────────────────────────────

/// 切換到下一階段
#[tauri::command]
pub fn advance_phase(state: State<AppState>) -> GameState {
    let mut gs = state.0.lock().unwrap();
    gs.phase = match gs.phase {
        GamePhase::Setup => {
            gs.round = 1;
            GamePhase::FirstNight
        }
        GamePhase::FirstNight => GamePhase::Day,
        GamePhase::Day => {
            // 不再清除提名紀錄，以便保留歷史紀錄
            for p in gs.players.iter_mut() {
                p.is_nominated = false;
                if p.is_alive {
                    p.can_nominate = true;
                }
            }
            GamePhase::Night
        }
        GamePhase::Night => {
            gs.round += 1;
            GamePhase::Day
        }
    };
    gs.touch();
    gs.clone()
}

#[tauri::command]
pub fn revert_phase(state: State<AppState>) -> GameState {
    let mut gs = state.0.lock().unwrap();
    gs.phase = match gs.phase {
        GamePhase::Setup => GamePhase::Setup,
        GamePhase::FirstNight => {
            gs.round = 0;
            GamePhase::Setup
        }
        GamePhase::Day => {
            if gs.round <= 1 {
                GamePhase::FirstNight
            } else {
                gs.round -= 1;
                GamePhase::Night
            }
        }
        GamePhase::Night => GamePhase::Day,
    };
    gs.touch();
    gs.clone()
}

/// 直接設定遊戲階段
#[tauri::command]
pub fn set_phase(phase: GamePhase, state: State<AppState>) -> GameState {
    let mut gs = state.0.lock().unwrap();
    gs.phase = phase;
    gs.touch();
    gs.clone()
}

// ─── 投票/提名指令 ───────────────────────────────────────────

/// 發起提名
#[tauri::command]
pub fn nominate(nominator_id: String, nominee_id: String, state: State<AppState>) -> Result<GameState, String> {
    let mut gs = state.0.lock().unwrap();

    // 檢查本日是否已經有玩家被行刑
    let current_round = gs.round;
    if gs.nominations.iter().any(|n| n.round == current_round && n.executed) {
        return Err("今日已有玩家被行刑，無法再進行提名".into());
    }

    // 確認提名者可以提名
    let nominator = gs.players.iter().find(|p| p.id == nominator_id)
        .ok_or("找不到提名者")?;
    if !nominator.is_alive {
        return Err("死亡玩家無法發起提名".into());
    }
    if !nominator.can_nominate {
        return Err("該玩家今日已使用提名".into());
    }

    // 確認被提名者尚未被提名
    let nominee = gs.players.iter().find(|p| p.id == nominee_id)
        .ok_or("找不到被提名者")?;
    if nominee.is_nominated {
        return Err("該玩家今日已被提名過".into());
    }

    let threshold = gs.execution_threshold();
    let current_round = gs.round;
    gs.nominations.push(Nomination {
        nominator_id: nominator_id.clone(),
        nominee_id: nominee_id.clone(),
        votes_for: Vec::new(),
        threshold,
        executed: false,
        round: current_round,
    });

    // 標記提名者已使用提名，被提名者已被提名
    if let Some(p) = gs.players.iter_mut().find(|p| p.id == nominator_id) {
        p.can_nominate = false;
    }
    if let Some(p) = gs.players.iter_mut().find(|p| p.id == nominee_id) {
        p.is_nominated = true;
    }

    gs.touch();
    Ok(gs.clone())
}

/// 修改提名
#[tauri::command]
pub fn edit_nomination(
    nomination_index: usize, 
    new_nominator_id: String, 
    new_nominee_id: String, 
    state: State<AppState>
) -> Result<GameState, String> {
    let mut gs = state.0.lock().unwrap();

    let current_round = gs.round;
    
    // 取得舊的提名者與被提名者 ID，並檢查是否合法
    let old_nominator_id;
    let old_nominee_id;

    {
        let nom = gs.nominations.get(nomination_index).ok_or("找不到指定提名")?;
        if nom.executed {
            return Err("已執行的提名無法修改".into());
        }
        if nom.round != current_round {
            return Err("只能修改當日的提名".into());
        }
        old_nominator_id = nom.nominator_id.clone();
        old_nominee_id = nom.nominee_id.clone();
    }

    // 暫時釋放舊的狀態
    if let Some(p) = gs.players.iter_mut().find(|p| p.id == old_nominator_id) {
        p.can_nominate = true;
    }
    if let Some(p) = gs.players.iter_mut().find(|p| p.id == old_nominee_id) {
        p.is_nominated = false;
    }

    // 驗證新狀態
    let mut valid = true;
    let mut err_msg = "";

    // 1. 驗證提名者
    if let Some(nominator) = gs.players.iter().find(|p| p.id == new_nominator_id) {
        if !nominator.is_alive {
            valid = false; err_msg = "死亡玩家無法發起提名";
        } else if !nominator.can_nominate {
            valid = false; err_msg = "該提名者今日已發起過提名";
        }
    } else {
        valid = false; err_msg = "找不到提名者";
    }

    // 2. 驗證被提名者
    if valid {
        if let Some(nominee) = gs.players.iter().find(|p| p.id == new_nominee_id) {
            if nominee.is_nominated {
                valid = false; err_msg = "該被提名者今日已被提名過";
            }
        } else {
            valid = false; err_msg = "找不到被提名者";
        }
    }

    // 如果驗證失敗，還原舊狀態並報錯
    if !valid {
        if let Some(p) = gs.players.iter_mut().find(|p| p.id == old_nominator_id) {
            p.can_nominate = false;
        }
        if let Some(p) = gs.players.iter_mut().find(|p| p.id == old_nominee_id) {
            p.is_nominated = true;
        }
        return Err(err_msg.into());
    }

    // 套用新狀態
    if let Some(p) = gs.players.iter_mut().find(|p| p.id == new_nominator_id) {
        p.can_nominate = false;
    }
    if let Some(p) = gs.players.iter_mut().find(|p| p.id == new_nominee_id) {
        p.is_nominated = true;
    }

    if let Some(nom) = gs.nominations.get_mut(nomination_index) {
        nom.nominator_id = new_nominator_id;
        nom.nominee_id = new_nominee_id;
    }

    gs.touch();
    Ok(gs.clone())
}

/// 記錄投票
#[tauri::command]
pub fn vote(nomination_index: usize, voter_id: String, state: State<AppState>) -> Result<GameState, String> {
    let mut gs = state.0.lock().unwrap();
    
    // 獲取投票者當前狀態
    let (is_alive, has_ghost_vote) = gs.players.iter()
        .find(|p| p.id == voter_id)
        .map(|p| (p.is_alive, p.has_ghost_vote))
        .unwrap_or((true, false));

    if let Some(nom) = gs.nominations.get_mut(nomination_index) {
        if nom.votes_for.contains(&voter_id) {
            nom.votes_for.retain(|id| id != &voter_id); // 取消投票
            
            // 如果是死亡玩家取消投票，恢復其鬼魂投票權
            if !is_alive {
                if let Some(p) = gs.players.iter_mut().find(|p| p.id == voter_id) {
                    p.has_ghost_vote = true;
                }
            }
        } else {
            // 如果是死亡玩家投新票，檢查是否有權利
            if !is_alive && !has_ghost_vote {
                return Err("該死亡玩家已無投票權".into());
            }

            nom.votes_for.push(voter_id.clone());

            // 如果是死亡玩家投票，扣除其鬼魂投票權
            if !is_alive {
                if let Some(p) = gs.players.iter_mut().find(|p| p.id == voter_id) {
                    p.has_ghost_vote = false;
                }
            }
        }
        gs.touch();
        Ok(gs.clone())
    } else {
        Err("找不到指定提名".into())
    }
}

/// 執行行刑
#[tauri::command]
pub fn execute(nomination_index: usize, state: State<AppState>) -> Result<GameState, String> {
    let mut gs = state.0.lock().unwrap();

    // 檢查本日是否已經有玩家被行刑
    let current_round = gs.round;
    if gs.nominations.iter().any(|n| n.round == current_round && n.executed) {
        return Err("今日已有玩家被行刑，無法再次行刑".into());
    }

    // 獲取目標提名的票數
    let (target_votes, target_threshold) = {
        let nom = gs.nominations.get(nomination_index).ok_or("找不到指定提名")?;
        (nom.votes_for.len(), nom.threshold)
    };

    if target_votes < target_threshold as usize {
        return Err("票數未達門檻，無法行刑".into());
    }

    // 檢查是否為當前最高票且不平手
    let mut max_votes = 0;
    let mut tie_detected = false;
    
    for nom in gs.nominations.iter().filter(|n| n.round == current_round) {
        let v_count = nom.votes_for.len();
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
        let nominee_id = nom.nominee_id.clone();
        if let Some(p) = gs.players.iter_mut().find(|p| p.id == nominee_id) {
            p.is_alive = false;
        }
        gs.touch();
        Ok(gs.clone())
    } else {
        Err("找不到指定提名".into())
    }
}

/// 撤銷/反悔行刑
#[tauri::command]
pub fn undo_execution(nomination_index: usize, state: State<AppState>) -> Result<GameState, String> {
    let mut gs = state.0.lock().unwrap();
    let current_round = gs.round;
    if let Some(nom) = gs.nominations.get_mut(nomination_index) {
        if !nom.executed {
            return Err("該提名尚未執行行刑，無法撤銷".into());
        }

        // 僅限撤銷本日記錄
        if nom.round != current_round {
            return Err("僅能撤銷本日的行刑記錄".into());
        }

        nom.executed = false;
        let nominee_id = nom.nominee_id.clone();
        
        // 恢復玩家存活狀態與投票權
        if let Some(p) = gs.players.iter_mut().find(|p| p.id == nominee_id) {
            p.is_alive = true;
            p.has_ghost_vote = true;
        }
        
        gs.touch();
        Ok(gs.clone())
    } else {
        Err("找不到指定提名".into())
    }
}

// ─── 持久化指令 ──────────────────────────────────────────────

/// 匯出遊戲狀態為 JSON 字串
#[tauri::command]
pub fn export_game_state(state: State<AppState>) -> Result<String, String> {
    let gs = state.0.lock().unwrap();
    serde_json::to_string_pretty(&*gs).map_err(|e| e.to_string())
}

/// 從 JSON 字串匯入遊戲狀態
#[tauri::command]
pub fn import_game_state(json_str: String, state: State<AppState>) -> Result<GameState, String> {
    let new_state: GameState = serde_json::from_str(&json_str).map_err(|e| e.to_string())?;
    let mut gs = state.0.lock().unwrap();
    *gs = new_state;
    Ok(gs.clone())
}

/// 從 JSON 匯入自定義腳本
#[tauri::command]
pub fn import_custom_script(json_str: String, state: State<AppState>) -> Result<GameState, String> {
    let mut script = Script::empty();
    
    // 試著以官方完整 Script 模型解析
    if let Ok(s) = serde_json::from_str::<Script>(&json_str) {
        script = s;
    } else {
        // 如果失敗，試著以社群常見的陣列格式解析
        let values: Vec<Value> = serde_json::from_str(&json_str)
            .map_err(|e| format!("腳本格式解析失敗: {}", e))?;
            
        let mut characters = Vec::new();
        
        for val in values {
            let id = val.get("id").and_then(|v| v.as_str()).unwrap_or("").to_string();
            
            // 解析 _meta 元數據
            if id == "_meta" {
                if let Some(name) = val.get("name").and_then(|v| v.as_str()) {
                    script.name = name.to_string();
                }
                if let Some(author) = val.get("author").and_then(|v| v.as_str()) {
                    script.author = Some(author.to_string());
                }
                if let Some(logo) = val.get("logo").and_then(|v| v.as_str()) {
                    script.logo = Some(logo.to_string());
                }
                continue;
            }
            
            // 略過沒有 ID 的無效資料
            if id.is_empty() { continue; }
            
            // 解析角色資料
            let name = val.get("name").and_then(|v| v.as_str()).unwrap_or("未知").to_string();
            let name_en = val.get("name_en").and_then(|v| v.as_str()).unwrap_or(&id).to_string();
            let ability = val.get("ability").and_then(|v| v.as_str()).unwrap_or("").to_string();
            let flavor = val.get("flavor").and_then(|v| v.as_str()).map(|s| s.to_string());
            let team_str = val.get("team").or_else(|| val.get("role_type")).and_then(|v| v.as_str()).unwrap_or("townsfolk");
            
            let role_type = match team_str.to_lowercase().as_str() {
                "townsfolk" => RoleType::Townsfolk,
                "outsider" => RoleType::Outsider,
                "minion" => RoleType::Minion,
                "demon" => RoleType::Demon,
                "traveler" => RoleType::Traveler,
                "fabled" => RoleType::Fabled,
                _ => RoleType::Townsfolk,
            };
            
            let night_order_first = val.get("firstNight").and_then(|v| v.as_f64()).filter(|&n| n > 0.0);
            let night_order_other = val.get("otherNight").and_then(|v| v.as_f64()).filter(|&n| n > 0.0);
            let image = val.get("image").and_then(|v| v.as_str()).map(|s| s.to_string());
            let setup = val.get("setup").and_then(|v| v.as_bool()).unwrap_or(false);
            
            let mut reminders = Vec::new();
            if let Some(rems) = val.get("reminders").and_then(|v| v.as_array()) {
                for r in rems {
                    if let Some(r_str) = r.as_str() {
                        reminders.push(r_str.to_string());
                    }
                }
            }
            
            let first_night_reminder = val.get("firstNightReminder").and_then(|v| v.as_str()).map(|s| s.to_string());
            let other_night_reminder = val.get("otherNightReminder").and_then(|v| v.as_str()).map(|s| s.to_string());
            
            let mut conflicts = Vec::new();
            if let Some(confs) = val.get("conflicts").and_then(|v| v.as_array()) {
                for c in confs {
                    if let Ok(rule) = serde_json::from_value(c.clone()) {
                        conflicts.push(rule);
                    }
                }
            }
            
            characters.push(CharacterDef {
                id,
                name,
                name_en,
                role_type,
                ability,
                flavor,
                night_order_first,
                night_order_other,
                reminders,
                setup,
                image,
                first_night_reminder,
                other_night_reminder,
                conflicts,
            });
        }
        script.characters = characters;
    }

    let mut gs = state.0.lock().unwrap();
    gs.script = script;
    gs.touch();
    Ok(gs.clone())
}
