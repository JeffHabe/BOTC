import sys
import os
import json
import subprocess
import argparse

# 1. 檢查並安裝 Pillow
try:
    # pyrefly: ignore [missing-import]
    from PIL import Image, ImageDraw
except ImportError:
    print("Pillow is not installed. Installing it now...")
    try:
        subprocess.run([sys.executable, "-m", "pip", "install", "pillow"], check=True)
        # pyrefly: ignore [missing-import]
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
        help="Filter by team type(s), separated by commas, e.g., 鎮民,爪牙 or townsfolk,minion"
    )
    parser.add_argument(
        "--roles", 
        type=str, 
        default=None, 
        help="Filter by specific character names, separated by commas, e.g., 廚師,下毒者,小惡魔"
    )
    parser.add_argument(
        "--back-offset-x", 
        type=float, 
        default=0.0, 
        help="Physical horizontal offset compensation for back side in mm (default: 0.0)"
    )
    parser.add_argument(
        "--back-offset-y", 
        type=float, 
        default=0.0, 
        help="Physical vertical offset compensation for back side in mm (default: 0.0)"
    )
    parser.add_argument(
        "--flip", 
        type=str, 
        choices=["long", "short"],
        default="long", 
        help="Duplex flip mode for back side: 'long' (long-edge/horizontal, default) or 'short' (short-edge/vertical)"
    )
    parser.add_argument(
        "--new-only", "--skip-existing", "--incremental",
        dest="new_only",
        action="store_true",
        help="Only layout newly added tokens that haven't been laid out/printed yet"
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

def draw_start_edge_indicator(draw_obj, width, margin_top, is_back=False):
    """繪製頁面頂部的列印起始邊（進紙方向）標記與對位線"""
    if margin_top < 40:
        return
    center_x = width // 2
    center_y = margin_top // 2
    
    arrow_h = min(80, margin_top // 3)
    arrow_w = int(arrow_h * 1.5)
    line_w = 500
    
    color = (100, 100, 100, 255) if is_back else (160, 160, 160, 255)
    
    # 1. 繪製向上箭頭 ▲ 指示進紙/開始邊
    top_pt = (center_x, center_y - arrow_h // 2)
    left_pt = (center_x - arrow_w // 2, center_y + arrow_h // 2)
    right_pt = (center_x + arrow_w // 2, center_y + arrow_h // 2)
    draw_obj.polygon([top_pt, left_pt, right_pt], fill=color)
    
    # 2. 繪製頂部基準水平對位線
    line_y = center_y + arrow_h // 2 + 15
    draw_obj.line([(center_x - line_w // 2, line_y), (center_x + line_w // 2, line_y)], fill=color, width=6)
    
    # 3. 繪製標示文字
    label = "PRINT START / BackSide(TOP)" if is_back else "PRINT START / FrontSide(TOP)"
    try:
        # pyrefly: ignore [missing-import]
        from PIL import ImageFont
        try:
            font = ImageFont.load_default(size=42)
        except TypeError:
            font = ImageFont.load_default()
        
        bbox = draw_obj.textbbox((0, 0), label, font=font)
        text_w = bbox[2] - bbox[0]
        text_x = center_x - text_w // 2
        text_y = line_y + 15
        if text_y < margin_top - 20:
            draw_obj.text((text_x, text_y), label, fill=color, font=font)
    except Exception:
        pass

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
    BACK_OFFSET_X = int(args.back_offset_x * DPI / 25.4)
    BACK_OFFSET_Y = int(args.back_offset_y * DPI / 25.4)

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
    manifest_path = os.path.join(output_dir, ".printed_tokens.json")
    printed_tokens = set()
    if os.path.exists(manifest_path):
        try:
            with open(manifest_path, "r", encoding="utf-8") as mf:
                printed_tokens = set(json.load(mf))
        except Exception:
            printed_tokens = set()

    # 清理舊的 png 檔案
    if args.new_only:
        # 只清理舊的 A4_Page_New 增量圖檔，保留正式全量 A4_Page 檔案
        for file in os.listdir(output_dir):
            if file.lower().startswith("a4_page_new_") and file.lower().endswith(".png"):
                try:
                    os.remove(os.path.join(output_dir, file))
                except Exception:
                    pass
    elif not args.roles and not args.team:
        # 全量排版時清空舊的 PNG 檔案與紀錄
        for file in os.listdir(output_dir):
            if file.lower().endswith(".png"):
                try:
                    os.remove(os.path.join(output_dir, file))
                except Exception:
                    pass
        printed_tokens = set()
    
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

    # 1. 依據陣營過濾 (支援多個，以逗號分隔)
    if args.team:
        team_inputs = [t.strip().lower() for t in args.team.split(",") if t.strip()]
        target_teams = set(team_map.get(t, t) for t in team_inputs)
        all_files = [
            f for f in all_files 
            if any(f.startswith(f"{target}_") for target in target_teams)
        ]
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

    # 3. 依據 --new-only 增量模式過濾（僅保留未曾排版過的新角色）
    if args.new_only:
        all_files = [f for f in all_files if f not in printed_tokens]
        print(f"Filtered by --new-only -> {len(all_files)} NEW unprinted tokens remaining.")
    
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
        # 建立白色背景的 A4 畫布 (正面與背面)
        page_img = Image.new("RGBA", (A4_WIDTH, A4_HEIGHT), (255, 255, 255, 255))
        draw = ImageDraw.Draw(page_img)
        
        page_back_img = Image.new("RGBA", (A4_WIDTH, A4_HEIGHT), (255, 255, 255, 255))
        draw_back = ImageDraw.Draw(page_back_img)
        
        # 繪製頁面頂部的列印起始邊（進紙方向）標記
        draw_start_edge_indicator(draw, A4_WIDTH, MARGIN_TOP, is_back=False)
        draw_start_edge_indicator(draw_back, A4_WIDTH, MARGIN_TOP, is_back=True)
        
        start_idx = page_idx * TOKENS_PER_PAGE
        end_idx = min(start_idx + TOKENS_PER_PAGE, total_tokens)
        page_files = all_files[start_idx:end_idx]
        
        line_ext = max(int(2 * DPI / 25.4), GAP // 2)
        
        for item_idx, filename in enumerate(page_files):
            row = item_idx // COLS
            col = item_idx % COLS
            
            # 正面貼上座標
            x = MARGIN_LEFT + col * (TOKEN_BODY_SIZE + GAP)
            y = MARGIN_TOP + row * (TOKEN_BODY_SIZE + GAP)
            
            # 1. 繪製正面極淡灰色裁切輔助圓線 (向外微調 CUT_OFFSET 像素)
            draw.ellipse(
                [x - CUT_OFFSET, y - CUT_OFFSET, x + TOKEN_BODY_SIZE + CUT_OFFSET, y + TOKEN_BODY_SIZE + CUT_OFFSET], 
                outline=(238, 238, 238, 255), 
                width=2
            )
            
            # 背面翻轉座標（長邊翻轉或短邊翻轉）與中心線 (含微調補償)
            if args.flip == "short":
                col_back = col
                row_back = ROWS - 1 - row
            else:
                col_back = COLS - 1 - col
                row_back = row

            x_back = MARGIN_LEFT + col_back * (TOKEN_BODY_SIZE + GAP) + BACK_OFFSET_X
            y_back = MARGIN_TOP + row_back * (TOKEN_BODY_SIZE + GAP) + BACK_OFFSET_Y
            cx_back = x_back + TOKEN_BODY_SIZE // 2
            cy_back = y_back + TOKEN_BODY_SIZE // 2
            radius_back = TOKEN_BODY_SIZE // 2 + CUT_OFFSET

            # 繪製背面裁切輔助圓線（加深加粗便利對位）
            draw_back.ellipse(
                [x_back - CUT_OFFSET, y_back - CUT_OFFSET, x_back + TOKEN_BODY_SIZE + CUT_OFFSET, y_back + TOKEN_BODY_SIZE + CUT_OFFSET],
                outline=(120, 120, 120, 255),
                width=5
            )
            # 繪製背面十字中心線（加深加粗）
            draw_back.line([cx_back - radius_back - line_ext, cy_back, cx_back + radius_back + line_ext, cy_back], fill=(120, 120, 120, 255), width=5)
            draw_back.line([cx_back, cy_back - radius_back - line_ext, cx_back, cy_back + radius_back + line_ext], fill=(120, 120, 120, 255), width=5)
            
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
        page_prefix = "A4_Page_New_" if args.new_only else "A4_Page_"
        output_filename = f"{page_prefix}{page_idx + 1}.png"
        output_path = os.path.join(output_dir, output_filename)
        
        # 轉為 RGB 格式保存為 PNG，節約硬碟容量
        rgb_page = page_img.convert("RGB")
        rgb_page.save(output_path, "PNG", dpi=(DPI, DPI))
        
        # 保存背面圖檔
        output_back_filename = f"{page_prefix}{page_idx + 1}_Back.png"
        output_back_path = os.path.join(output_dir, output_back_filename)
        rgb_back_page = page_back_img.convert("RGB")
        rgb_back_page.save(output_back_path, "PNG", dpi=(DPI, DPI))
        
        print(f"Generated: {output_path} & {output_back_path} ({len(page_files)} tokens)")

    # 更新並儲存已排版紀錄（當非特定過濾模式時）
    if not args.team and not args.roles:
        printed_tokens.update(all_files)
        try:
            with open(manifest_path, "w", encoding="utf-8") as mf:
                json.dump(sorted(list(printed_tokens)), mf, ensure_ascii=False, indent=2)
            print(f"Updated layout manifest: {manifest_path} ({len(printed_tokens)} tokens recorded)")
        except Exception as e:
            print(f"Warning: Failed to update manifest {manifest_path} -> {e}")

    print("A4 Layout compilation completed successfully!")

if __name__ == "__main__":
    main()
