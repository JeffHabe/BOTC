#[warn(unused_imports)]
// use uuid::Uuid;
use crate::models::{
    CharacterDef, GamePhase, GameState, Nomination, Player, ReminderToken, RoleType, Script,
};
use serde_json::Value;
use std::sync::Mutex;
use tauri::{AppHandle, State};
use std::fs::OpenOptions;
use std::io::Write;
use tauri_plugin_notification::NotificationExt;
use log::{info, warn, error, debug};

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
    info!("開始新對局 (New Game)");
    let mut gs = state.0.lock().unwrap();
    *gs = GameState::default();
    gs.clone()
}

/// 重置所有玩家狀態（保留名單）
#[tauri::command]
pub fn reset_players_state(state: State<AppState>) -> GameState {
    info!("重置所有玩家狀態，保留座位名單");
    let mut gs = state.0.lock().unwrap();
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
            gs.players.push(Player::new("空座位", seat));
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
pub fn rename_player(
    player_id: String,
    new_name: String,
    state: State<AppState>,
) -> Result<GameState, String> {
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
pub fn swap_seats(
    player_id_a: String,
    player_id_b: String,
    state: State<AppState>,
) -> Result<GameState, String> {
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
pub fn reorder_players(
    player_ids: Vec<String>,
    state: State<AppState>,
) -> Result<GameState, String> {
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
pub fn assign_role(
    player_id: String,
    role: Option<CharacterDef>,
    state: State<AppState>,
) -> Result<GameState, String> {
    let mut gs = state.0.lock().unwrap();
    if let Some(p) = gs.players.iter_mut().find(|p| p.id == player_id) {
        p.role = role;
        gs.touch();
        Ok(gs.clone())
    } else {
        Err(format!("找不到玩家 ID: {}", player_id))
    }
}

/// 設定惡魔偽裝角色
#[tauri::command]
pub fn set_demon_bluff(
    index: usize,
    role: Option<CharacterDef>,
    state: State<AppState>,
) -> Result<GameState, String> {
    let mut gs = state.0.lock().unwrap();
    if index >= 3 {
        return Err("偽裝索引必須為 0, 1, 或 2".into());
    }
    gs.demon_bluffs[index] = role;
    gs.touch();
    Ok(gs.clone())
}

/// 設定瘋子偽裝角色
#[tauri::command]
pub fn set_lunatic_bluff(
    index: usize,
    role: Option<CharacterDef>,
    state: State<AppState>,
) -> Result<GameState, String> {
    let mut gs = state.0.lock().unwrap();
    if index >= 3 {
        return Err("偽裝索引必須為 0, 1, 或 2".into());
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
    state: State<AppState>,
) -> Result<GameState, String> {
    let mut gs = state.0.lock().unwrap();

    for a in assignments {
        if let Some(p) = gs.players.iter_mut().find(|p| p.id == a.player_id) {
            p.role = a.role;
        }
    }

    // 如果傳入的偽裝列表不為空，才更新（保留彈性）
    if !bluffs.is_empty() {
        gs.demon_bluffs = bluffs;
    }

    gs.touch();
    Ok(gs.clone())
}

// ─── 提醒令牌指令 ────────────────────────────────────────────

/// 新增提醒令牌到玩家
#[tauri::command]
pub fn add_reminder(
    player_id: String,
    text: String,
    source_role: String,
    state: State<AppState>,
) -> Result<GameState, String> {
    let mut gs = state.0.lock().unwrap();
    let current_round = gs.round;
    if let Some(p) = gs.players.iter_mut().find(|p| p.id == player_id) {
        p.reminders
            .push(ReminderToken::new(&text, &source_role, current_round));
        gs.touch();
        Ok(gs.clone())
    } else {
        Err(format!("找不到玩家 ID: {}", player_id))
    }
}

/// 修改提醒令牌文字
#[tauri::command]
pub fn update_reminder(
    player_id: String,
    reminder_id: String,
    new_text: String,
    state: State<AppState>,
) -> Result<GameState, String> {
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
pub fn remove_reminder(
    player_id: String,
    reminder_id: String,
    state: State<AppState>,
) -> Result<GameState, String> {
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

/// 標記玩家死亡
#[tauri::command]
pub fn kill_player(player_id: String, state: State<AppState>) -> Result<GameState, String> {
    let mut gs = state.0.lock().unwrap();
    if let Some(p) = gs.players.iter_mut().find(|p| p.id == player_id) {
        make_player_dead(p);
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
        p.extra_nominations = 0;
        p.extra_votes = 0;
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
            // 在進入夜晚時增加輪次
            gs.round += 1;
            for p in gs.players.iter_mut() {
                p.is_nominated = false;
                if p.is_alive {
                    p.can_nominate = true;
                }
            }
            GamePhase::Night
        }
        GamePhase::Night => {
            // 進入白天時不再增加輪次
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
        GamePhase::Setup | GamePhase::FirstNight => {
            gs.round = 1;
            GamePhase::FirstNight
        }
        GamePhase::Day => {
            if gs.round <= 1 {
                GamePhase::FirstNight
            } else {
                // 如果是 Day 2，退回應該是 Night 2，所以 round 不變
                GamePhase::Night
            }
        }
        GamePhase::Night => {
            // 從 Night 2 退回應該是 Day 1，所以 round 減 1
            gs.round -= 1;
            GamePhase::Day
        }
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
pub fn nominate(
    nominator_id: String,
    nominee_id: String,
    state: State<AppState>,
) -> Result<GameState, String> {
    let mut gs = state.0.lock().unwrap();


    // 確認提名者可以提名
    let nominator = gs
        .players
        .iter()
        .find(|p| p.id == nominator_id)
        .ok_or("找不到提名者")?;
    if !nominator.can_nominate && nominator.extra_nominations == 0 {
        return Err("該玩家今日已使用提名".into());
    }

    // 確認被提名者尚未被提名
    let nominee = gs
        .players
        .iter()
        .find(|p| p.id == nominee_id)
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
        extra_votes: 0,
    });

    // 標記提名者已使用提名，被提名者已被提名
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
    Ok(gs.clone())
}

/// 修改提名
#[tauri::command]
pub fn edit_nomination(
    nomination_index: usize,
    new_nominator_id: String,
    new_nominee_id: String,
    state: State<AppState>,
) -> Result<GameState, String> {
    let mut gs = state.0.lock().unwrap();

    let current_round = gs.round;

    // 取得舊的提名者與被提名者 ID，並檢查是否合法
    let old_nominator_id;
    let old_nominee_id;

    {
        let nom = gs
            .nominations
            .get(nomination_index)
            .ok_or("找不到指定提名")?;
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
        if !nominator.can_nominate {
            valid = false;
            err_msg = "該提名者今日已發起過提名";
        }
    } else {
        valid = false;
        err_msg = "找不到提名者";
    }

    // 2. 驗證被提名者
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

/// 調整提名的額外票數
#[tauri::command]
pub fn adjust_extra_votes(
    nomination_index: usize,
    extra_votes: i32,
    state: State<AppState>,
) -> Result<GameState, String> {
    let mut gs = state.0.lock().unwrap();
    if let Some(nom) = gs.nominations.get_mut(nomination_index) {
        nom.extra_votes = extra_votes;
        gs.touch();
        Ok(gs.clone())
    } else {
        Err("找不到指定提名".into())
    }
}

/// 記錄投票
#[tauri::command]
pub fn vote(
    nomination_index: usize,
    voter_id: String,
    state: State<AppState>,
) -> Result<GameState, String> {
    let mut gs = state.0.lock().unwrap();

    // 獲取投票者當前狀態 (一次性讀取)
    let (is_alive, has_ghost_vote, voter_extra_votes) = gs
        .players
        .iter()
        .find(|p| p.id == voter_id)
        .map(|p| (p.is_alive, p.has_ghost_vote, p.extra_votes))
        .unwrap_or((true, false, 0));

    // 先讀取當前提名是否已包含該投票者，並在判斷後釋放唯讀借用
    let is_voted = if let Some(nom) = gs.nominations.get(nomination_index) {
        nom.votes_for.contains(&voter_id)
    } else {
        return Err("找不到指定提名".into());
    };

    if is_voted {
        // 1. 取消投票
        // 1-1. 還原死亡玩家的投票權
        if !is_alive {
            if let Some(p) = gs.players.iter_mut().find(|p| p.id == voter_id) {
                if !p.has_ghost_vote {
                    p.has_ghost_vote = true;
                } else {
                    p.extra_votes += 1;
                }
            }
        }
        // 1-2. 在提名中移出投票者 (此時 gs.players 借用已釋放，可以安全 mutable 借用 nominations)
        if let Some(nom) = gs.nominations.get_mut(nomination_index) {
            nom.votes_for.retain(|id| id != &voter_id);
        }
    } else {
        // 2. 投新票
        // 2-1. 檢查是否有權利
        let has_any_vote = has_ghost_vote || voter_extra_votes > 0;
        if !is_alive && !has_any_vote {
            return Err("該死亡玩家已無投票權".into());
        }
        // 2-2. 扣除死亡玩家投票權
        if !is_alive {
            if let Some(p) = gs.players.iter_mut().find(|p| p.id == voter_id) {
                if p.extra_votes > 0 {
                    p.extra_votes -= 1;
                } else {
                    p.has_ghost_vote = false;
                }
            }
        }
        // 2-3. 在提名中加入投票者 (此時 gs.players 借用已釋放，可以安全 mutable 借用 nominations)
        if let Some(nom) = gs.nominations.get_mut(nomination_index) {
            nom.votes_for.push(voter_id.clone());
        }
    }

    gs.touch();
    Ok(gs.clone())
}

/// 執行行刑
#[tauri::command]
pub fn execute(nomination_index: usize, state: State<AppState>) -> Result<GameState, String> {
    let mut gs = state.0.lock().unwrap();
    let current_round = gs.round;


    // 獲取目標提名的票數和當前的動態處決門檻
    let (target_votes, target_threshold) = {
        let nom = gs
            .nominations
            .get(nomination_index)
            .ok_or("找不到指定提名")?;
        ((nom.votes_for.len() as i32 + nom.extra_votes).max(0) as usize, gs.execution_threshold())
    };

    if target_votes < target_threshold as usize {
        return Err("票數未達門檻，無法行刑".into());
    }

    // 檢查是否為當前最高票且不平手
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
        // 鎖定執行時的最終門檻值
        nom.threshold = target_threshold;
        let nominee_id = nom.nominee_id.clone();
        if let Some(p) = gs.players.iter_mut().find(|p| p.id == nominee_id) {
            // 只有當玩家原本是存活狀態時，被處決才會被標記死亡並掛上「處決」提醒
            if p.is_alive {
                make_player_dead(p);
                p.reminders.push(ReminderToken::new("處決", "系統", current_round));
            }
        }
        gs.touch();
        Ok(gs.clone())
    } else {
        Err("找不到指定提名".into())
    }
}

/// 撤銷/反悔行刑
#[tauri::command]
pub fn undo_execution(
    nomination_index: usize,
    state: State<AppState>,
) -> Result<GameState, String> {
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
            // 只有當玩家身上存有「處決」標記時，才說明他是因本次處決而死亡的，此時才進行復活與還原
            let died_from_execution = p.reminders.iter().any(|r| r.text == "處決");
            if died_from_execution {
                p.is_alive = true;
                p.has_ghost_vote = true;
                p.reminders.retain(|r| r.text != "處決");
            }
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

/// 啟動後端計時器通知 (針對 Android 背景優化)
#[tauri::command]
pub async fn start_background_timer(app: AppHandle, seconds: u64) {
    info!("啟動背景計時器通知，計時時間: {} 秒", seconds);
    std::thread::spawn(move || {
        std::thread::sleep(std::time::Duration::from_secs(seconds));
        info!("背景計時器時間到，觸發本地推送通知");
        let _ = app
            .notification()
            .builder()
            .title("計時結束")
            .body("時間到囉！鐘樓的鐘聲響起了。")
            .show();
    });
}

/// 寫入實體日誌檔案，如果目錄不存在則自動建立
#[tauri::command]
pub fn write_log_file(app: AppHandle, level: String, message: String) -> Result<(), String> {
    let log_dir = app.path().app_log_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&log_dir).map_err(|e| e.to_string())?;
    let log_path = log_dir.join("botc_app.log");

    // 檢查檔案大小並在超過 1MB 時進行 Rotate 輪轉
    if log_path.exists() {
        if let Ok(metadata) = std::fs::metadata(&log_path) {
            if metadata.len() >= 1 * 1024 * 1024 {
                let max_backups = 3;
                for i in (1..max_backups).rev() {
                    let src = log_dir.join(format!("botc_app.{}.log", i));
                    let dst = log_dir.join(format!("botc_app.{}.log", i + 1));
                    if src.exists() {
                        let _ = std::fs::rename(src, dst);
                    }
                }
                let backup_1 = log_dir.join("botc_app.1.log");
                let _ = std::fs::rename(&log_path, backup_1);
            }
        }
    }

    let timestamp = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    let log_line = format!("[{}] [{}] {}\n", timestamp, level.to_uppercase(), message);

    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(log_path)
        .map_err(|e| e.to_string())?;

    file.write_all(log_line.as_bytes()).map_err(|e| e.to_string())?;
    Ok(())
}

/// 從 JSON 匯入自定義腳本
#[tauri::command]
pub fn import_custom_script(json_str: String, state: State<AppState>) -> Result<GameState, String> {
    let mut script = Script::empty();

    // 試著以官方完整 Script 模型解析
    if let Ok(s) = serde_json::from_str::<Script>(&json_str) {
        script = s;
    } else {
        debug!("嘗試以常規 Script 格式解析失敗，改用社群 Array 格式解析...");
        // 如果失敗，試著以社群常見的陣列格式解析
        let values: Vec<Value> =
            serde_json::from_str(&json_str).map_err(|e| {
                warn!("自定義劇本 JSON 解析失敗: {}", e);
                format!("腳本格式解析失敗: {}", e)
            })?;

        let mut characters = Vec::new();

        for val in values {
            let id = val
                .get("id")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();

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
            if id.is_empty() {
                continue;
            }

            // 解析角色資料
            let name = val
                .get("name")
                .and_then(|v| v.as_str())
                .unwrap_or("未知")
                .to_string();
            let name_en = val
                .get("name_en")
                .and_then(|v| v.as_str())
                .unwrap_or(&id)
                .to_string();
            let ability = val
                .get("ability")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let flavor = val
                .get("flavor")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
            let team_str = val
                .get("team")
                .or_else(|| val.get("role_type"))
                .and_then(|v| v.as_str())
                .unwrap_or("townsfolk");

            let role_type = match team_str.to_lowercase().as_str() {
                "townsfolk" => RoleType::Townsfolk,
                "outsider" => RoleType::Outsider,
                "minion" => RoleType::Minion,
                "demon" => RoleType::Demon,
                "traveler" => RoleType::Traveler,
                "fabled" => RoleType::Fabled,
                _ => RoleType::Townsfolk,
            };

            let night_order_first = val
                .get("firstNight")
                .and_then(|v| v.as_f64())
                .filter(|&n| n > 0.0);
            let night_order_other = val
                .get("otherNight")
                .and_then(|v| v.as_f64())
                .filter(|&n| n > 0.0);
            let image = val
                .get("image")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
            let setup = val.get("setup").and_then(|v| v.as_bool()).unwrap_or(false);

            let mut reminders = Vec::new();
            if let Some(rems) = val.get("reminders").and_then(|v| v.as_array()) {
                for r in rems {
                    if let Some(r_str) = r.as_str() {
                        reminders.push(r_str.to_string());
                    }
                }
            }

            let first_night_reminder = val
                .get("firstNightReminder")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
            let other_night_reminder = val
                .get("otherNightReminder")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());

            let mut conflicts = Vec::new();
            if let Some(confs) = val.get("conflicts").and_then(|v| v.as_array()) {
                for c in confs {
                    if let Ok(rule) = serde_json::from_value(c.clone()) {
                        conflicts.push(rule);
                    }
                }
            }

            let reminders_global = val
                .get("remindersGlobal")
                .and_then(|v| v.as_array())
                .map(|arr| {
                    arr.iter()
                        .filter_map(|v| v.as_str().map(|s| s.to_string()))
                        .collect()
                })
                .unwrap_or_default();

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
                reminders_global,
                setup,
                image,
                first_night_reminder,
                other_night_reminder,
                conflicts,
            });
        }
        script.characters = characters;
    }

    // 對所有已解析角色的夜晚順序進行防重調整（若有相同則持續遞增 +0.1 直至不重複）
    let mut adjusted_characters = Vec::new();
    for mut char_def in script.characters {
        if let Some(mut val) = char_def.night_order_first {
            while adjusted_characters.iter().any(|other: &CharacterDef| {
                if let Some(other_val) = other.night_order_first {
                    (val - other_val).abs() < 1e-9
                } else {
                    false
                }
            }) {
                val += 0.1;
            }
            char_def.night_order_first = Some(val);
        }

        if let Some(mut val) = char_def.night_order_other {
            while adjusted_characters.iter().any(|other: &CharacterDef| {
                if let Some(other_val) = other.night_order_other {
                    (val - other_val).abs() < 1e-9
                } else {
                    false
                }
            }) {
                val += 0.1;
            }
            char_def.night_order_other = Some(val);
        }
        adjusted_characters.push(char_def);
    }
    script.characters = adjusted_characters;

    let mut gs = state.0.lock().unwrap();
    gs.script = script;
    gs.touch();
    Ok(gs.clone())
}

// ─── 自動持久化指令 ──────────────────────────────────────────────

use std::fs;
use std::path::PathBuf;
use tauri::Manager;

/// 取得存檔文件路徑
fn get_save_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let mut path = app.path().app_data_dir().map_err(|e| e.to_string())?;
    if !path.exists() {
        fs::create_dir_all(&path).map_err(|e| e.to_string())?;
    }
    path.push("savegame.json");
    Ok(path)
}

/// 保存當前遊戲狀態到實體文件
#[tauri::command]
pub fn save_game_state(
    state: GameState,
    state_manager: State<AppState>,
    app: tauri::AppHandle,
) -> Result<(), String> {
    // 同步更新後端記憶體狀態
    {
        let mut gs = state_manager.0.lock().unwrap();
        *gs = state.clone();
    }

    let path = get_save_path(&app)?;
    let json = serde_json::to_string_pretty(&state).map_err(|e| {
        error!("序列化存檔失敗: {}", e);
        e.to_string()
    })?;
    fs::write(&path, json).map_err(|e| {
        error!("寫入存檔檔案失敗: {}", e);
        e.to_string()
    })?;
    info!("遊戲狀態已成功保存並更新至記憶體: {:?}", path);
    Ok(())
}

/// 從實體文件讀取並恢復遊戲狀態
#[tauri::command]
pub fn load_game_state(state: State<AppState>, app: tauri::AppHandle) -> Result<GameState, String> {
    let path = get_save_path(&app)?;
    if !path.exists() {
        warn!("載入存檔失敗，檔案不存在: {:?}", path);
        return Err("SAVENOTFOUND".into());
    }
    let json = fs::read_to_string(&path).map_err(|e| {
        error!("讀取存檔檔案失敗: {}", e);
        e.to_string()
    })?;
    let loaded_state: GameState = serde_json::from_str(&json).map_err(|e| {
        error!("解析存檔 JSON 失敗: {}", e);
        e.to_string()
    })?;

    // 同步到內存狀態
    let mut gs = state.0.lock().unwrap();
    *gs = loaded_state.clone();
    info!("已成功載入本地遊戲存檔");

    Ok(loaded_state)
}

/// 移除/取消提名
#[tauri::command]
pub fn remove_nomination(
    nomination_index: usize,
    state: State<AppState>,
) -> Result<GameState, String> {
    let mut gs = state.0.lock().unwrap();
    let current_round = gs.round;

    if nomination_index >= gs.nominations.len() {
        return Err("找不到指定提名".into());
    }

    let nom = &gs.nominations[nomination_index];
    if nom.executed {
        return Err("已執行的提名無法取消，請先撤銷處決".into());
    }
    if nom.round != current_round {
        return Err("只能取消當日的提名".into());
    }

    let nominator_id = nom.nominator_id.clone();
    let nominee_id = nom.nominee_id.clone();
    let voters = nom.votes_for.clone();

    // 1. 還原提名者的 can_nominate
    if let Some(p) = gs.players.iter_mut().find(|p| p.id == nominator_id) {
        p.can_nominate = true;
    }

    // 2. 還原被提名者的 is_nominated
    if let Some(p) = gs.players.iter_mut().find(|p| p.id == nominee_id) {
        p.is_nominated = false;
    }

    // 3. 還原投票中所有死亡玩家的鬼魂投票權 (has_ghost_vote)
    for voter_id in voters {
        if let Some(p) = gs.players.iter_mut().find(|p| p.id == voter_id) {
            if !p.is_alive {
                p.has_ghost_vote = true;
            }
        }
    }

    // 4. 從陣列中移除
    gs.nominations.remove(nomination_index);

    gs.touch();
    Ok(gs.clone())
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct LicenseState {
    pub last_run_date: String,
    #[serde(default = "generate_new_device_id")]
    pub device_id: String,
    #[serde(default = "default_expiry_date")]
    pub expiry_date: String,
    #[serde(default = "default_is_activated")]
    pub is_activated: bool,
}

fn generate_new_device_id() -> String {
    uuid::Uuid::new_v4().to_string()
}

fn default_is_activated() -> bool {
    false
}

fn add_two_months(date: chrono::NaiveDate) -> chrono::NaiveDate {
    use chrono::Datelike;
    let mut year = date.year();
    let mut month = date.month() + 2;
    if month > 12 {
        month -= 12;
        year += 1;
    }
    let mut day = date.day();
    loop {
        if let Some(d) = chrono::NaiveDate::from_ymd_opt(year, month, day) {
            return d;
        }
        if day <= 28 {
            break;
        }
        day -= 1;
    }
    date
}

fn default_expiry_date() -> String {
    let now = chrono::Local::now().naive_local().date();
    add_two_months(now).format("%Y-%m-%d").to_string()
}

#[derive(serde::Serialize, Clone, Debug)]
#[serde(tag = "status", content = "data")]
pub enum LicenseStatus {
    Valid { remaining_days: i64, expiry_date: String, device_id: String, is_activated: bool },
    Expired { expiry_date: String, device_id: String, is_activated: bool },
    TimeTampered { device_id: String },
}

/// 使用 FNV-1a (64-bit) 搭配密碼鹽值計算金鑰簽名 (16位大寫十六進位)
fn compute_license_key(device_id: &str, expiry_date: &str) -> String {
    let salt = "BOTC_GRIMOIRE_SALT_2026_SECRET_KEY_#@!$";
    let input = format!("{}:{}:{}", device_id, expiry_date, salt);
    
    let mut hash: u64 = 0xcbf29ce484222325;
    for byte in input.bytes() {
        hash ^= byte as u64;
        hash = hash.wrapping_mul(0x100000001b3);
    }
    
    format!("{:016X}", hash)
}

/// 將日期 (8字元) 與 16位簽名進行錯位交錯，生成 24位金鑰
fn interleave_key(date_str: &str, signature_hex: &str) -> String {
    let date_bytes = date_str.as_bytes();
    let sig_bytes = signature_hex.as_bytes();
    
    let mut result = Vec::with_capacity(24);
    let mut d_idx = 0;
    let mut s_idx = 0;
    
    for _ in 0..8 {
        result.push(date_bytes[d_idx]);
        d_idx += 1;
        result.push(sig_bytes[s_idx]);
        s_idx += 1;
        result.push(sig_bytes[s_idx]);
        s_idx += 1;
    }
    
    String::from_utf8(result).unwrap_or_default()
}

/// 解碼 24位交錯金鑰，還原出 (日期, 簽名)
fn de_interleave_key(key: &str) -> Option<(String, String)> {
    let clean_key = key.trim().replace("-", "");
    if clean_key.len() != 24 {
        return None;
    }
    
    let key_bytes = clean_key.as_bytes();
    let mut date_bytes = Vec::with_capacity(8);
    let mut sig_bytes = Vec::with_capacity(16);
    
    for chunk in key_bytes.chunks_exact(3) {
        date_bytes.push(chunk[0]);
        sig_bytes.push(chunk[1]);
        sig_bytes.push(chunk[2]);
    }
    
    let date_str = String::from_utf8(date_bytes).ok()?;
    let sig_str = String::from_utf8(sig_bytes).ok()?;
    Some((date_str, sig_str))
}

/// 檢查離線授權狀態 (防倒改系統時間與檢查過期)
#[tauri::command]
pub fn check_license(app: tauri::AppHandle) -> Result<LicenseStatus, String> {
    let now = chrono::Local::now().naive_local().date();
    let mut path = app.path().app_data_dir().map_err(|e| e.to_string())?;
    if !path.exists() {
        std::fs::create_dir_all(&path).map_err(|e| e.to_string())?;
    }
    path.push("license_state.json");
    
    let mut state = if path.exists() {
        let content = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
        serde_json::from_str::<LicenseState>(&content).unwrap_or_else(|_| LicenseState {
            last_run_date: now.format("%Y-%m-%d").to_string(),
            device_id: generate_new_device_id(),
            expiry_date: default_expiry_date(),
            is_activated: false,
        })
    } else {
        LicenseState {
            last_run_date: now.format("%Y-%m-%d").to_string(),
            device_id: generate_new_device_id(),
            expiry_date: default_expiry_date(),
            is_activated: false,
        }
    };
    
    let last_run = chrono::NaiveDate::parse_from_str(&state.last_run_date, "%Y-%m-%d")
        .unwrap_or(now);
    
    let expiry_date = chrono::NaiveDate::parse_from_str(&state.expiry_date, "%Y-%m-%d")
        .unwrap_or_else(|_| chrono::NaiveDate::parse_from_str(&default_expiry_date(), "%Y-%m-%d").unwrap());
        
    // 1. 檢查是否倒改時間 (防作弊)
    if now < last_run {
        error!("偵測到系統時間異常！當前時間 {} 早於歷史執行時間 {}", now, last_run);
        return Ok(LicenseStatus::TimeTampered {
            device_id: state.device_id,
        });
    }
    
    // 2. 檢查是否已過期
    if now > expiry_date {
        warn!("試用授權已過期！截止日期: {}, 當前日期: {}", expiry_date, now);
        return Ok(LicenseStatus::Expired {
            expiry_date: state.expiry_date.clone(),
            device_id: state.device_id,
            is_activated: state.is_activated,
        });
    }
    
    // 3. 更新歷史執行日期並保存
    let mut modified = false;
    if now > last_run {
        state.last_run_date = now.format("%Y-%m-%d").to_string();
        modified = true;
    }
    if !path.exists() {
        modified = true;
    }
    
    if modified {
        let json = serde_json::to_string_pretty(&state).map_err(|e| e.to_string())?;
        std::fs::write(&path, json).map_err(|e| e.to_string())?;
    }
    
    let remaining_days = (expiry_date - now).num_days();
    Ok(LicenseStatus::Valid {
        remaining_days,
        expiry_date: state.expiry_date,
        device_id: state.device_id,
        is_activated: state.is_activated,
    })
}

/// 啟用授權金鑰 (自動解密錯位金鑰並驗證)
#[tauri::command]
pub fn activate_license(app: tauri::AppHandle, key: String) -> Result<LicenseStatus, String> {
    let now = chrono::Local::now().naive_local().date();
    let mut path = app.path().app_data_dir().map_err(|e| e.to_string())?;
    path.push("license_state.json");
    
    if !path.exists() {
        return Err("授權檔案不存在，請先啟動 App 進行初始化！".to_string());
    }
    
    let content = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let mut state = serde_json::from_str::<LicenseState>(&content).map_err(|e| e.to_string())?;
    
    // 1. 解碼錯位金鑰
    let (date_str, sig_hex) = de_interleave_key(&key)
        .ok_or_else(|| "金鑰格式錯誤，請確認輸入是否完整！(應為 24 位字元)".to_string())?;
        
    // 格式化 YYYYMMDD 為 YYYY-MM-DD
    if date_str.len() != 8 {
        return Err("金鑰日期解析失敗！".to_string());
    }
    let expiry_date_formatted = format!(
        "{}-{}-{}",
        &date_str[0..4],
        &date_str[4..6],
        &date_str[6..8]
    );
    
    // 驗證日期合法性
    let target_expiry_date = chrono::NaiveDate::parse_from_str(&expiry_date_formatted, "%Y-%m-%d")
        .map_err(|_| "金鑰中的到期日不合法！".to_string())?;
        
    if target_expiry_date < now {
        return Err("該金鑰的授權日期已過期，無法啟用！".to_string());
    }
    
    // 2. 計算預期的簽名金鑰
    let expected_sig = compute_license_key(&state.device_id, &expiry_date_formatted);
    
    if sig_hex.to_uppercase() != expected_sig {
        return Err("授權金鑰不正確，請確認此金鑰是否與您的裝置識別碼綁定！".to_string());
    }
    
    // 3. 驗證成功，寫入新的到期日期，並重置最後運行時間為今日
    state.expiry_date = expiry_date_formatted;
    state.last_run_date = now.format("%Y-%m-%d").to_string(); // 重置時間鎖以防止之前改時間產生的異常阻擋
    state.is_activated = true;
    
    let json = serde_json::to_string_pretty(&state).map_err(|e| e.to_string())?;
    std::fs::write(&path, json).map_err(|e| e.to_string())?;
    
    info!("授權成功延長至：{}", state.expiry_date);
    
    // 返回最新的驗證狀態
    check_license(app)
}

/// 提供後端獨立金鑰生成函數 (雖然不用暴露給 App，但保留以供未來輔助)
pub fn generate_key_backend(device_id: &str, expiry_date: &str) -> Result<String, String> {
    // expiry_date 應為 YYYY-MM-DD
    let clean_date = expiry_date.replace("-", "");
    if clean_date.len() != 8 {
        return Err("日期格式錯誤，應為 YYYY-MM-DD".to_string());
    }
    let sig = compute_license_key(device_id, expiry_date);
    Ok(interleave_key(&clean_date, &sig))
}



