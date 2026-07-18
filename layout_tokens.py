import sys
import os
import subprocess
import argparse

# 1. 檢查並安裝 Pillow
try:
    from PIL import Image, ImageDraw
except ImportError:
    print("Pillow is not installed. Installing it now...")
    try:
        subprocess.run([sys.executable, "-m", "pip", "install", "pillow"], check=True)
        from PIL import Image, ImageDraw
        print("Pillow installed successfully!")
    except Exception as e:
        print(f"Error installing Pillow: {e}. Please run 'pip install pillow' manually.")
        sys.exit(1)

def parse_args():
    parser = argparse.ArgumentParser(description="BOTC A4 Token Layout Compiler (600 DPI)")
    parser.add_argument(
        "--size", 
        type=float, 
        default=25.0, 
        help="Target physical diameter of the token in mm (default: 25.0)"
    )
    parser.add_argument(
        "--gap", 
        type=float, 
        default=3.0, 
        help="Physical gap between tokens in mm (default: 3.0)"
    )
    parser.add_argument(
        "--offset", 
        type=int, 
        default=2, 
        help="Cutting line outward offset in pixels (default: 2)"
    )
    parser.add_argument(
        "--team", 
        type=str, 
        default=None, 
        help="Filter by team type, e.g., townsfolk / 鎮民 / demon / 惡魔"
    )
    parser.add_argument(
        "--roles", 
        type=str, 
        default=None, 
        help="Filter by specific character names, separated by commas, e.g., 廚師,下毒者,小惡魔"
    )
    return parser.parse_args()

# 陣營排序優先級
TEAM_PRIORITY = {
    "鎮民": 0,
    "外來者": 1,
    "爪牙": 2,
    "惡魔": 3,
    "旅客": 4,
    "傳奇": 5,
    "特殊": 6
}

def sort_key(filename):
    parts = filename.split("_", 1)
    if len(parts) == 2:
        team = parts[0]
        return (TEAM_PRIORITY.get(team, 99), filename)
    return (99, filename)

def main():
    args = parse_args()
    
    # 2. 參數配置 (600 DPI HD 版)
    DPI = 600
    A4_WIDTH = 4960
    A4_HEIGHT = 7016

    # 實體尺寸轉像素 (TOKEN_BODY_SIZE 與 GAP)
    TOKEN_BODY_SIZE = int(args.size * DPI / 25.4)
    GAP = int(args.gap * DPI / 25.4)
    CUT_OFFSET = args.offset

    # 由於源截圖中令片主體 (600px) 佔整張截圖 (750px) 的 80%
    IMAGE_SIZE = int(TOKEN_BODY_SIZE / 0.8)
    # 偏置量，用於將整張圖片中心對齊格子中心
    OFFSET = (IMAGE_SIZE - TOKEN_BODY_SIZE) // 2

    # 自動計算行列數，確保完全填滿且不超出 A4 邊界
    COLS = int((A4_WIDTH + GAP) / (TOKEN_BODY_SIZE + GAP))
    ROWS = int((A4_HEIGHT + GAP) / (TOKEN_BODY_SIZE + GAP))
    TOKENS_PER_PAGE = COLS * ROWS

    # 計算總佈局寬高與置中邊距
    TOTAL_LAYOUT_WIDTH = COLS * TOKEN_BODY_SIZE + (COLS - 1) * GAP
    TOTAL_LAYOUT_HEIGHT = ROWS * TOKEN_BODY_SIZE + (ROWS - 1) * GAP

    MARGIN_LEFT = (A4_WIDTH - TOTAL_LAYOUT_WIDTH) // 2
    MARGIN_TOP = (A4_HEIGHT - TOTAL_LAYOUT_HEIGHT) // 2

    source_dir = "Token_png"
    output_dir = "Token_A4"
    
    if not os.path.exists(source_dir):
        print(f"Error: Directory '{source_dir}' does not exist.")
        return
        
    os.makedirs(output_dir, exist_ok=True)
    # 清空 Token_A4 底下舊的 png 檔案，避免殘留其他參數生成的頁面
    for file in os.listdir(output_dir):
        if file.lower().endswith(".png"):
            try:
                os.remove(os.path.join(output_dir, file))
            except Exception:
                pass
    
    # 獲取所有令片 PNG 圖片
    all_files = [f for f in os.listdir(source_dir) if f.lower().endswith(".png")]
    all_files = sorted(all_files, key=sort_key)
    
    # 陣營與中文名稱對照，便於使用者輸入英文或中文
    team_map = {
        "鎮民": "鎮民", "townsfolk": "鎮民",
        "外來者": "外來者", "outsider": "外來者",
        "爪牙": "爪牙", "minion": "爪牙",
        "惡魔": "惡魔", "demon": "惡魔",
        "旅客": "旅客", "traveler": "旅客",
        "傳奇": "傳奇", "fabled": "傳奇",
        "特殊": "特殊", "loric": "特殊"
    }

    # 1. 依據陣營過濾
    if args.team:
        clean_team_input = args.team.strip().lower()
        target_team = team_map.get(clean_team_input, args.team.strip())
        all_files = [f for f in all_files if f.startswith(f"{target_team}_")]
        print(f"Filtered by team '{args.team}' -> {len(all_files)} tokens remaining.")

    # 2. 依據指定角色名稱過濾 (支援多個，以逗號分隔)
    if args.roles:
        target_roles = [r.strip() for r in args.roles.split(",") if r.strip()]
        filtered_files = []
        for f in all_files:
            parts = f.split("_", 1)
            char_name = os.path.splitext(parts[1] if len(parts) == 2 else f)[0]
            if char_name in target_roles:
                filtered_files.append(f)
        all_files = filtered_files
        print(f"Filtered by roles '{args.roles}' -> {len(all_files)} tokens remaining.")
    
    total_tokens = len(all_files)
    print(f"Found {total_tokens} tokens in total.")
    print(f"Layout Parameters:")
    print(f"  - Token Diameter: {args.size} mm ({TOKEN_BODY_SIZE} px)")
    print(f"  - Gap Between Tokens: {args.gap} mm ({GAP} px)")
    print(f"  - Cut Line Offset: {args.offset} px")
    print(f"  - Calculated Grid: {COLS} columns x {ROWS} rows ({TOKENS_PER_PAGE} per page)")
    
    if total_tokens == 0:
        print("No tokens found. Make sure you generated them first.")
        return

    # 計算需要多少頁
    num_pages = (total_tokens + TOKENS_PER_PAGE - 1) // TOKENS_PER_PAGE
    print(f"Will generate {num_pages} A4 page(s) at 600 DPI resolution ({A4_WIDTH}x{A4_HEIGHT} px)...")

    for page_idx in range(num_pages):
        # 建立白色背景的 A4 畫布
        page_img = Image.new("RGBA", (A4_WIDTH, A4_HEIGHT), (255, 255, 255, 255))
        draw = ImageDraw.Draw(page_img)
        
        start_idx = page_idx * TOKENS_PER_PAGE
        end_idx = min(start_idx + TOKENS_PER_PAGE, total_tokens)
        page_files = all_files[start_idx:end_idx]
        
        for item_idx, filename in enumerate(page_files):
            row = item_idx // COLS
            col = item_idx % COLS
            
            # 計算貼上座標
            x = MARGIN_LEFT + col * (TOKEN_BODY_SIZE + GAP)
            y = MARGIN_TOP + row * (TOKEN_BODY_SIZE + GAP)
            
            # 1. 繪製極淡灰色裁切輔助圓線 (向外微調 CUT_OFFSET 像素)
            draw.ellipse(
                [x - CUT_OFFSET, y - CUT_OFFSET, x + TOKEN_BODY_SIZE + CUT_OFFSET, y + TOKEN_BODY_SIZE + CUT_OFFSET], 
                outline=(238, 238, 238, 255), 
                width=2
            )
            
            # 2. 加載並縮放 Token 圖片
            file_path = os.path.join(source_dir, filename)
            try:
                with Image.open(file_path) as token_img:
                    # 將整張圖片縮放到 IMAGE_SIZE (含邊緣)
                    token_img_resized = token_img.resize((IMAGE_SIZE, IMAGE_SIZE), Image.Resampling.LANCZOS)
                    # 偏置貼上，使令片主體剛好落在裁切圈內
                    page_img.paste(token_img_resized, (x - OFFSET, y - OFFSET), token_img_resized)
            except Exception as e:
                print(f"Warning: Failed to process {filename} -> {e}")
        
        # 保存為高品質 PNG 格式
        output_filename = f"A4_Page_{page_idx + 1}.png"
        output_path = os.path.join(output_dir, output_filename)
        
        # 轉為 RGB 格式保存為 PNG，節約硬碟容量
        rgb_page = page_img.convert("RGB")
        rgb_page.save(output_path, "PNG", dpi=(DPI, DPI))
        print(f"Generated: {output_path} ({len(page_files)} tokens)")

    print("A4 Layout compilation completed successfully!")

if __name__ == "__main__":
    main()
