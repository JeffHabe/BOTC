/**
 * 血染鐘樓標準人數配置表
 * Standard Blood on the Clocktower player alignment setup.
 */

export interface AlignmentConfig {
  townsfolk: number;
  outsider: number;
  minion: number;
  demon: number;
}

export const BASE_SETUP_TABLE: Record<number, AlignmentConfig> = {
  5:  { townsfolk: 3, outsider: 0, minion: 1, demon: 1 },
  6:  { townsfolk: 3, outsider: 1, minion: 1, demon: 1 },
  7:  { townsfolk: 5, outsider: 0, minion: 1, demon: 1 },
  8:  { townsfolk: 5, outsider: 1, minion: 1, demon: 1 },
  9:  { townsfolk: 5, outsider: 2, minion: 1, demon: 1 },
  10: { townsfolk: 7, outsider: 0, minion: 2, demon: 1 },
  11: { townsfolk: 7, outsider: 1, minion: 2, demon: 1 },
  12: { townsfolk: 7, outsider: 2, minion: 2, demon: 1 },
  13: { townsfolk: 9, outsider: 0, minion: 3, demon: 1 },
  14: { townsfolk: 9, outsider: 1, minion: 3, demon: 1 },
  15: { townsfolk: 9, outsider: 2, minion: 3, demon: 1 },
};

/**
 * 根據總人數獲取基礎配置
 */
export function getBaseSetup(count: number): AlignmentConfig {
  if (count < 5) {
    return { townsfolk: count, outsider: 0, minion: 0, demon: 0 };
  }
  if (count > 15) {
    // 15 人以上通常是 15 人基礎 + 旅行者，故返回 15 人配置
    return { ...BASE_SETUP_TABLE[15] };
  }
  return { ...BASE_SETUP_TABLE[count] };
}
