import os
import json
import urllib.request
import urllib.parse
import http.server
import socketserver
import threading
import subprocess
import time
import shutil

PORT = 8012

# 1. 建立必要目錄
os.makedirs("Token_png", exist_ok=True)
# 清空 Token_png 底下舊的 png 檔案，避免命名規則混合
for file in os.listdir("Token_png"):
    if file.lower().endswith(".png"):
        try:
            os.remove(os.path.join("Token_png", file))
        except Exception:
            pass

TEMP_ROLES_DIR = os.path.join("public", "pic", "temp_roles")
os.makedirs(TEMP_ROLES_DIR, exist_ok=True)

# 2. 啟動 HTTP 伺服器
class SilentHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

def start_server():
    handler = SilentHTTPRequestHandler
    socketserver.TCPServer.allow_reuse_address = True
    try:
        with socketserver.TCPServer(("localhost", PORT), handler) as httpd:
            print(f"HTTP Server started at http://localhost:{PORT}")
            httpd.serve_forever()
    except Exception as e:
        # 如果已經啟動了，就忽略
        pass

server_thread = threading.Thread(target=start_server, daemon=True)
server_thread.start()
time.sleep(1) # 等待伺服器啟動

# 3. 搜尋瀏覽器
def find_browser():
    # 優先找 Microsoft Edge，因為 Windows 必有
    edge_paths = [
        os.path.expandvars(r"%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"),
        os.path.expandvars(r"%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"),
        shutil.which("msedge"),
        shutil.which("microsoft-edge")
    ]
    for path in edge_paths:
        if path and os.path.exists(path):
            return path

    # 再找 Chrome
    chrome_paths = [
        os.path.expandvars(r"%ProgramFiles%\Google\Chrome\Application\chrome.exe"),
        os.path.expandvars(r"%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"),
        shutil.which("chrome"),
        shutil.which("google-chrome")
    ]
    for path in chrome_paths:
        if path and os.path.exists(path):
            return path
            
    return None

browser_path = find_browser()
if not browser_path:
    print("Error: Could not find MS Edge or Google Chrome. Please install one of them.")
    exit(1)
print(f"Using browser: {browser_path}")

# 4. 讀取 JSON 並下載圖片
JSON_PATH = "botc-characters-1779376221737.json"
if not os.path.exists(JSON_PATH):
    print(f"Error: {JSON_PATH} not found.")
    exit(1)

with open(JSON_PATH, "r", encoding="utf-8") as f:
    characters = json.load(f)

# 跳過 _meta
roles = [c for c in characters if c.get("id") != "_meta"]
print(f"Total roles to process: {len(roles)}")

# 下載圖片邏輯
def download_image(url, local_path):
    if os.path.exists(local_path):
        return True
    if not url:
        return False
    try:
        req = urllib.request.Request(
            url, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
        )
        with urllib.request.urlopen(req, timeout=10) as response, open(local_path, 'wb') as out_file:
            shutil.copyfileobj(response, out_file)
        return True
    except Exception as e:
        print(f"Warning: Failed to download {url} -> {e}")
        return False

# 遍歷下載
print("Downloading character icons...")
for role in roles:
    role_id = role.get("id")
    img_url = role.get("image")
    if not role_id:
        continue
    
    # 取得副檔名，或預設 .png
    ext = ".png"
    if img_url:
        parsed_url = urllib.parse.urlparse(img_url)
        path = parsed_url.path
        if "." in os.path.basename(path):
            ext = os.path.splitext(os.path.basename(path))[1]
    
    local_filename = f"{role_id}{ext}"
    local_path = os.path.join(TEMP_ROLES_DIR, local_filename)
    role["local_img"] = f"public/pic/temp_roles/{local_filename}"
    
    if img_url:
        success = download_image(img_url, local_path)
        if not success:
            role["local_img"] = "" # 標記為空以觸發 fallback
    else:
        role["local_img"] = ""

# 5. 無頭瀏覽器截圖
print("Generating tokens using headless browser...")
# 陣營中文名稱對照
TEAM_ZH = {
    "townsfolk": "鎮民",
    "outsider": "外來者",
    "minion": "爪牙",
    "demon": "惡魔",
    "traveler": "旅客",
    "fabled": "傳奇",
    "loric": "特殊"
}

for idx, role in enumerate(roles):
    role_id = role.get("id", "unknown")
    name = role.get("name", "")
    team = role.get("team", "townsfolk")
    local_img = role.get("local_img", "")
    
    if not name:
        continue

    # 構造 URL
    params = {
        "name": name,
        "team": team,
        "img": local_img
    }
    query_str = urllib.parse.urlencode(params)
    url = f"http://localhost:{PORT}/token_template.html?{query_str}"
    
    # 輸出路徑 (加上陣營前綴)
    team_zh_name = TEAM_ZH.get(team, team)
    output_filename = f"{team_zh_name}_{name}.png"
    output_path = os.path.abspath(os.path.join("Token_png", output_filename))
    
    # 調用 msedge 截圖
    cmd = [
        browser_path,
        "--headless",
        "--disable-gpu",
        "--window-size=750,750",
        "--hide-scrollbars",
        "--default-background-color=00000000",
        "--virtual-time-budget=800",
        f"--screenshot={output_path}",
        url
    ]
    
    try:
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=15)
        print(f"[{idx+1}/{len(roles)}] Generated: {role_id} -> {output_filename}")
    except Exception as e:
        print(f"[{idx+1}/{len(roles)}] Error generating {role_id}: {e}")

print("All tokens generated successfully! Checking output directory...")
try:
    print(f"Token_png directory contains {len(os.listdir('Token_png'))} images.")
except Exception:
    print("Token_png directory contains images, but listing directory had encoding issues.")
