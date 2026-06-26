import sys
import re

def compute_license_key(device_id: str, expiry_date: str) -> str:
    # Matches Rust's compute_license_key:
    # let salt = "BOTC_GRIMOIRE_SALT_2026_SECRET_KEY_#@!$";
    # let input = format!("{}:{}:{}", device_id, expiry_date, salt);
    salt = "BOTC_GRIMOIRE_SALT_2026_SECRET_KEY_#@!$"
    input_str = f"{device_id}:{expiry_date}:{salt}"
    
    # FNV-1a 64-bit
    hash_val = 0xcbf29ce484222325
    for byte in input_str.encode('utf-8'):
        hash_val ^= byte
        hash_val = (hash_val * 0x100000001b3) & 0xffffffffffffffff
        
    return f"{hash_val:016X}"

def interleave_key(date_str: str, signature_hex: str) -> str:
    # Matches Rust's interleave_key
    # 8 date chars, 16 sig chars
    # Put 1 date char, then 2 sig chars
    result = []
    d_idx = 0
    s_idx = 0
    for _ in range(8):
        result.append(date_str[d_idx])
        d_idx += 1
        result.append(signature_hex[s_idx])
        s_idx += 1
        result.append(signature_hex[s_idx])
        s_idx += 1
    return "".join(result)

def main():
    print("=========================================")
    print("   《染鐘樓謎團魔典》 離線授權金鑰產生器  ")
    print("=========================================")
    
    if len(sys.argv) >= 3:
        device_id = sys.argv[1].strip()
        expiry_date = sys.argv[2].strip()
    else:
        device_id = input("請輸入目標裝置識別碼 (UUID)：").strip()
        expiry_date = input("請輸入授權到期日期 (格式 YYYY-MM-DD，例如 2026-12-31)：").strip()
        
    # 簡單驗證
    if not device_id:
        print("[錯誤] 裝置識別碼不能為空！")
        sys.exit(1)
        
    date_pattern = re.compile(r"^\d{4}-\d{2}-\d{2}$")
    if not date_pattern.match(expiry_date):
        print(f"[錯誤] 到期日期格式不正確 ({expiry_date})，應為 YYYY-MM-DD，例如 2026-12-31")
        sys.exit(1)
        
    # 清理日期格式為 YYYYMMDD
    clean_date = expiry_date.replace("-", "")
    if len(clean_date) != 8:
        print("[錯誤] 解析後的日期長度錯誤！")
        sys.exit(1)
        
    # 1. 計算簽名
    sig = compute_license_key(device_id, expiry_date)
    
    # 2. 進行交錯錯位生成 24 位金鑰
    license_key = interleave_key(clean_date, sig)
    
    # 格式化為 XXXX-XXXX-XXXX... 的形式以便輸入
    formatted_key = "-".join(license_key[i:i+4] for i in range(0, len(license_key), 4))
    
    print("\n--- 生成成功 ---")
    print(f"裝置識別碼：{device_id}")
    print(f"到期時間  ：{expiry_date}")
    print(f"授權金鑰  ：{license_key}")
    print(f"格式化金鑰：{formatted_key}")
    print("----------------\n")

if __name__ == "__main__":
    main()
