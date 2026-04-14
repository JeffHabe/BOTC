use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum RoleType {
    Townsfolk, // 鎮民
    Outsider,  // 外來者
    Minion,    // 爪牙
    Demon,     // 惡魔
    Traveler,  // 旅行者
    Fabled,    // 傳說
}

fn main() {
    let json = "\"Townsfolk\"";
    let res: Result<RoleType, _> = serde_json::from_str(json);
    println!("{:?}", res);
    
    let err_json = "\"townsfolk\"";
    let res2: Result<RoleType, _> = serde_json::from_str(err_json);
    println!("{:?}", res2);
}
