import json
import os

target_file = r"d:\BOTC\src-tauri\data\all_character_sort.json"

# 18 個待置頂的國風劇本角色 ID
target_ids = [

"chef"
,
"investigator"
,
"empath"
,
"slayer"
,
"monk"
,
"soldier"
,
"ravenkeeper"
,
"undertaker"
,
"librarian"
,
"washerwoman"
,
"fortune_teller"
,
"virgin"
,
"mayor"

]

def main():
    if not os.path.exists(target_file):
        print(f"Error: File not found at {target_file}")
        return
        
    with open(target_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    # 提取 _meta 節點
    meta = None
    characters = []
    for item in data:
        if item.get("id") == "_meta":
            meta = item
        else:
            characters.append(item)

    # 分割為置頂角色與其他角色
    top_chars = []
    other_chars = []
    
    char_map = {c["id"]: c for c in characters}
    
    # 按照 target_ids 的給定順序提取置頂角色
    for tid in target_ids:
        if tid in char_map:
            top_chars.append(char_map[tid])
        else:
            print(f"Warning: ID '{tid}' not found in the character list.")
            
    # 保留其餘角色原有的相對順序
    for c in characters:
        if c["id"] not in target_ids:
            other_chars.append(c)

    # 合併結果
    new_data = []
    if meta:
        new_data.append(meta)
    new_data.extend(top_chars)
    new_data.extend(other_chars)

    # 寫回檔案
    with open(target_file, "w", encoding="utf-8") as f:
        json.dump(new_data, f, ensure_ascii=False, indent=2)

    print("SUCCESS: Sorted successfully!")

if __name__ == "__main__":
    main()
