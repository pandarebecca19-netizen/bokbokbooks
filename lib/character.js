// ---- character growth (EXP = total pages read) ----
// Pure functions only, derived from reading stats — no DB. The character
// levels up and evolves as completed-page count (EXP) grows.

// cumulative pages (EXP) needed to REACH each level (index 0 = Lv.1)
export const LEVEL_THRESHOLDS = [0, 300, 800, 1600, 3000, 5000, 8000, 12000, 18000, 26000];
export const MAX_LEVEL = LEVEL_THRESHOLDS.length;

// how the character looks per level band
export const CHARACTER_STAGES = [
  { minLevel: 1, emoji: "🥚", name: "책알" },
  { minLevel: 3, emoji: "🐣", name: "아기새" },
  { minLevel: 5, emoji: "🐥", name: "어린 새" },
  { minLevel: 7, emoji: "🐤", name: "튼튼한 새" },
  { minLevel: 9, emoji: "🦉", name: "지혜의 부엉이" },
];

export function levelFromExp(exp) {
  const e = Number(exp) || 0;
  let level = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (e >= LEVEL_THRESHOLDS[i]) level = i + 1;
  }
  return level;
}

export function characterStageFor(level) {
  let stage = CHARACTER_STAGES[0];
  for (const s of CHARACTER_STAGES) {
    if (level >= s.minLevel) stage = s;
  }
  return stage;
}

// progress within the current level toward the next
export function levelProgress(exp) {
  const e = Number(exp) || 0;
  const level = levelFromExp(e);
  const curBase = LEVEL_THRESHOLDS[level - 1];
  if (level >= MAX_LEVEL) {
    return { level, exp: e, percent: 100, toNext: 0, isMax: true };
  }
  const nextBase = LEVEL_THRESHOLDS[level];
  const percent = Math.min(100, Math.round(((e - curBase) / (nextBase - curBase)) * 100));
  return { level, exp: e, percent, toNext: nextBase - e, isMax: false };
}
