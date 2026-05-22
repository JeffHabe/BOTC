import json
import os

def sort_by_team():
    file_path = r"D:\BOTC\src-tauri\data\sort.json"
    
    if not os.path.exists(file_path):
        print(f"Error: {file_path} does not exist.")
        return

    with open(file_path, "r", encoding="utf-8") as f:
        try:
            data = json.load(f)
        except Exception as e:
            print(f"Error reading JSON: {e}")
            return

    # 定義 team 的順序
    team_order = {
        "townsfolk": 0,
        "outsider": 1,
        "minion": 2,
        "demon": 3,
        "traveler":4,
        "fabled":5,
        "loric":6
    }

    # 進行排序，如果 team 不在定義中（如 traveler 或其他），則排在最後 (權重為 4)
    # Python 的 sorted 是穩定的，會保留相同 team 原本的相對順序
    sorted_data = sorted(data, key=lambda x: team_order.get(x.get("team"), 4))

    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(sorted_data, f, ensure_ascii=False, indent=2)
    
    print("Successfully sorted sort.json by team (townsfolk -> outsider -> minion -> demon)!")

if __name__ == "__main__":
    sort_by_team()
