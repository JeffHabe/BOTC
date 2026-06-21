"""
md_to_pdf.py
將指定的 Markdown 文件轉換成 PDF (.pdf)，並嵌入其中的本機圖片。
用法：
    py scripts/md_to_pdf.py guide/player_guide.md
輸出檔案將輸出在與輸入相同目錄下，副檔名改為 .pdf。
"""
import sys
import re
import os
from pathlib import Path
# pyrefly: ignore [missing-import]
from markdown_pdf import MarkdownPdf, Section

def resolve_image_paths(text: str, base_dir: Path, project_root: Path) -> str:
    """將 Markdown 與 HTML 中的圖片相對路徑替換為相對於專案根目錄的相對路徑，以便 PDF 渲染引擎讀取。"""
    
    # 0. 預處理：清除所有僅包含圖片的行之前導空白，並在前後注入空行，避免被當成 Code Block 或行內小圖
    text = re.sub(r"^[ \t]*(!\[[^\]]*\]\([^)]+\))[ \t]*$", r"\n\1\n", text, flags=re.MULTILINE)
    
    # 1. 替換 Markdown 圖片格式 ![alt](src)
    def repl_md(match):
        alt = match.group(1)
        src = match.group(2)
        
        # 預處理 file:/// 協定或絕對路徑
        if src.startswith("file:///"):
            src_clean = src.replace("file:///", "")
            full_path = Path(src_clean).resolve()
        elif os.path.isabs(src) or (len(src) > 1 and src[1] == ":"):
            full_path = Path(src).resolve()
        else:
            full_path = (base_dir / src).resolve()
        
        # 💡 自動將 .svg 替換為 .png (相容性更佳)
        path_str = str(full_path).replace(".svg", ".png")
        if not os.path.exists(path_str) and full_path.exists():
            path_str = str(full_path)
            
        rel_path = os.path.relpath(path_str, project_root).replace('\\', '/')
        return f"![{alt}]({rel_path})"

    text = re.sub(r"!\[([^\]]*)\]\(([^)]+?)\)", repl_md, text)

    # 2. 替換 HTML <img> 圖片格式 <img ... src="src" ...>
    def repl_html(match):
        full_img_tag = match.group(0)
        src = match.group(2)
        
        # 預處理 file:/// 協定或絕對路徑
        if src.startswith("file:///"):
            src_clean = src.replace("file:///", "")
            full_path = Path(src_clean).resolve()
        elif os.path.isabs(src) or (len(src) > 1 and src[1] == ":"):
            full_path = Path(src).resolve()
        else:
            full_path = (base_dir / src).resolve()
        
        # 💡 自動將 .svg 替換為 .png
        path_str = str(full_path).replace(".svg", ".png")
        if not os.path.exists(path_str) and full_path.exists():
            path_str = str(full_path)
            
        rel_path = os.path.relpath(path_str, project_root).replace('\\', '/')
        # 替換 src 屬性的內容
        return re.sub(r'src=["\']' + re.escape(src) + r'["\']', f'src="{rel_path}"', full_img_tag)

    text = re.sub(r"(<img\s+[^>]*src=[\"']([^\"']+)[\"'][^>]*>)", repl_html, text)
    return text

def convert(md_file: str):
    md_path = Path(md_file).resolve()
    if md_path.suffix.lower() != ".md":
        print("錯誤：輸入檔案必須是 Markdown 檔案 (.md)")
        sys.exit(1)
        
    project_root = Path(__file__).resolve().parent.parent
    base_dir = md_path.parent
    out_path = md_path.with_suffix(".pdf")
    
    print(f"正在讀取：{md_path}")
    md_content = md_path.read_text(encoding="utf-8")
    
    # 💡 關鍵步驟：解析並替換所有相對路徑圖片為相對專案根目錄的路徑
    print("正在解析並替換圖片相對路徑...")
    resolved_content = resolve_image_paths(md_content, base_dir, project_root)
    
    # 💡 定義自訂 CSS 樣式排版
    css = """
    @page {
        margin: 20mm 20mm 20mm 20mm;
        size: A4;
    }
    body {
        font-family: "Microsoft JhengHei", system-ui, -apple-system, sans-serif;
        font-size: 11pt;
        line-height: 1.6;
        color: #333333;
    }
    h1, h2, h3, h4, h5, h6 {
        font-family: "Microsoft JhengHei", system-ui, -apple-system, sans-serif;
        color: #8c6d2f; /* 古典暗金黃色 */
        margin-top: 1.2em;
        margin-bottom: 0.6em;
        font-weight: bold;
    }
    h1 { font-size: 20pt; border-bottom: 1px solid #c8a96e; padding-bottom: 4px; }
    h2 { font-size: 16pt; border-bottom: 1.5px dashed rgba(200, 169, 110, 0.4); padding-bottom: 4px; }
    h3 { font-size: 13pt; }
    h4 { font-size: 11pt; }
    p {
        margin-top: 0;
        margin-bottom: 0.8em;
    }
    ul, ol {
        margin-top: 0;
        margin-bottom: 0.8em;
        padding-left: 20px;
    }
    li {
        margin-bottom: 0.4em;
    }
    img {
        width: 100%;
        height: auto;
        display: block;
        margin: 10px auto;
        border-radius: 4px;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
        page-break-inside: avoid;
        break-inside: avoid;
    }
    /* 💡 行內圖片（例如小圖標）不要居中換行 */
    img[width], img[height], img.inline {
        width: auto !important;
        display: inline-block !important;
        margin: 0 2px !important;
        vertical-align: middle !important;
        box-shadow: none !important;
    }
    code {
        font-family: Consolas, "Courier New", monospace;
        background-color: #f5f5f5;
        color: #c7254e;
        padding: 2px 4px;
        border-radius: 3px;
        font-size: 90%;
    }
    pre {
        background-color: #f5f5f5;
        border: 1px solid #ccc;
        border-radius: 4px;
        padding: 10px;
        overflow-x: auto;
        margin-bottom: 1em;
    }
    pre code {
        background-color: transparent;
        color: inherit;
        padding: 0;
        border-radius: 0;
        font-size: 100%;
    }
    table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 1em;
    }
    th, td {
        border: 1px solid #dddddd;
        padding: 8px;
        text-align: left;
    }
    th {
        background-color: #f2f2f2;
        font-weight: bold;
    }
    hr {
        border: 0;
        border-top: 1px solid #c8a96e;
        margin: 20px 0;
    }
    """
    
    print("正在生成 PDF...")
    pdf = MarkdownPdf(toc_level=2)
    # add_section 會將內容添加到 PDF，toc=True 代表會包含在 PDF 目錄/書籤中
    pdf.add_section(Section(resolved_content, toc=True, root=str(project_root)), user_css=css)
    
    pdf.save(str(out_path))
    print(f"[完成] 已輸出 PDF：{out_path}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("用法：py scripts/md_to_pdf.py <markdown檔案路徑>")
        sys.exit(1)
    convert(sys.argv[1])
