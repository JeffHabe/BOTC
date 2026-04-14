use std::fs;
use botc_grimoire::models::Script;

fn main() {
    let script_str = r#"
    {
        "id": "trouble_brewing",
        "name": "暗流涌動",
        "name_en": "Trouble Brewing",
        "author": "The Pandemonium Institute",
        "logo": null,
        "characters": [
            {
                "id": "washerwoman",
                "name": "洗衣婦",
                "name_en": "Washerwoman",
                "role_type": "Townsfolk",
                "ability": "你知道其中一名鎮民是哪兩個玩家中的一個。",
                "flavor": "我告訴你，那個人昨晚在這裡——帶著一套航髒的衣服和滿身的秘密。",
                "night_order_first": 30,
                "night_order_other": null,
                "reminders": ["鎮民", "錯誤"],
                "setup": false,
                "image": null
            }
        ]
    }
    "#;

    let res: Result<Script, _> = serde_json::from_str(script_str);
    match res {
        Ok(s) => println!("Success: {:?}", s.name),
        Err(e) => println!("Error: {}", e),
    }
}
