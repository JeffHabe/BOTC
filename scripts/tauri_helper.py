import asyncio
import os
import subprocess
from playwright.async_api import Playwright

def get_tauri_exe_path():
    """取得 Tauri 桌面應用程式 executable 的絕對路徑 (優先使用最新編譯的 release 或 debug)"""
    release_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..",  "target", "release", "botc-grimoire.exe"))
    debug_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..",  "target", "debug", "botc-grimoire.exe"))
    
    # 優先返回較新的執行檔，或存在的執行檔
    if os.path.exists(release_path) and os.path.exists(debug_path):
        # 比較兩者的修改時間，使用最新的
        if os.path.getmtime(release_path) > os.path.getmtime(debug_path):
            return release_path
        return debug_path
    elif os.path.exists(release_path):
        return release_path
    return debug_path

def start_tauri_process(screenshot_dir_name="tauri_native"):
    """啟動 Tauri 應用程式並設定 WebView2 的環境變數以開啟 CDP 除錯"""
    tauri_exe = get_tauri_exe_path()
    if not os.path.exists(tauri_exe):
        raise FileNotFoundError(f"找不到 Tauri 桌面程式: {tauri_exe}，請先編譯 debug 版本。")
        
    env = os.environ.copy()
    env["WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS"] = "--remote-debugging-port=9222"
    
    screenshot_dir = os.path.join(os.path.dirname(__file__), "..", "screenshots", screenshot_dir_name)
    os.makedirs(screenshot_dir, exist_ok=True)
    
    log_file_path = os.path.join(screenshot_dir, "tauri_stdout_stderr.log")
    log_file = open(log_file_path, "w", encoding="utf-8")
    
    print(f"[INFO] 啟動 Tauri 應用程式: {tauri_exe}")
    print(f"[INFO] Tauri 進程日誌將輸出至: {log_file_path}")
    
    tauri_process = subprocess.Popen(
        [tauri_exe],
        cwd=os.path.dirname(tauri_exe),
        env=env,
        stdout=log_file,
        stderr=log_file
    )
    return tauri_process, log_file

async def connect_to_tauri(p: Playwright):
    """連接 WebView2 的 CDP 除錯埠，包含 10 次重試機制"""
    print("[INFO] 嘗試透過 CDP 連線至 http://127.0.0.1:9222...")
    max_retries = 10
    browser = None
    for i in range(max_retries):
        try:
            browser = await p.chromium.connect_over_cdp("http://127.0.0.1:9222")
            break
        except Exception as conn_err:
            if i == max_retries - 1:
                raise conn_err
            print(f"[INFO] 連線失敗，第 {i+1}/{max_retries} 次重試中... (原因: {conn_err})")
            await asyncio.sleep(1)
    return browser

def close_tauri_process(tauri_process, log_file):
    """關閉日誌檔案與關閉 Tauri 進程"""
    try:
        log_file.close()
    except:
        pass
    print("[INFO] 正在關閉 Tauri 桌面程式進程...")
    tauri_process.terminate()
    try:
        tauri_process.wait(timeout=3)
    except subprocess.TimeoutExpired:
        tauri_process.kill()
    print("[INFO] Tauri 桌面程式進程已完全關閉。")
