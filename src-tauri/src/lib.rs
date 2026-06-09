use std::sync::Mutex;

pub mod models;
pub mod commands;

use commands::AppState;
use models::GameState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_sharekit::init())
        .manage(AppState(Mutex::new(GameState::default())))
        .invoke_handler(tauri::generate_handler![
            // 遊戲管理
            commands::get_game_state,
            commands::new_game,
            commands::reset_players_state,
            commands::set_script,
            // 玩家管理
            commands::add_player,
            commands::set_player_count,
            commands::remove_player,
            commands::rename_player,
            commands::swap_seats,
            commands::reorder_players,
            commands::toggle_fabled,
            // 角色指派
            commands::assign_role,
            commands::bulk_assign_roles,
            commands::set_demon_bluff,
            commands::set_lunatic_bluff,
            // 提醒令牌
            commands::add_reminder,
            commands::remove_reminder,
            commands::update_reminder,
            // 死亡/存活
            commands::kill_player,
            commands::revive_player,
            commands::use_ghost_vote,
            commands::toggle_ghost_vote,
            commands::toggle_can_nominate,
            // 遊戲階段
            commands::advance_phase,
            commands::revert_phase,
            commands::set_phase,
            // 投票
            commands::nominate,
            commands::edit_nomination,
            commands::vote,
            commands::execute,
            commands::undo_execution,
            commands::remove_nomination,
            // 持久化
            commands::export_game_state,
            commands::import_game_state,
            commands::import_custom_script,
            commands::save_game_state,
            commands::load_game_state,
            commands::start_background_timer,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
