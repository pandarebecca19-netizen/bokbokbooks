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

// the next growth stage after the current level (null if already final)
export function nextStageFor(level) {
  const current = characterStageFor(level);
  const idx = CHARACTER_STAGES.indexOf(current);
  return CHARACTER_STAGES[idx + 1] || null;
}

// pages of EXP still needed to reach a given stage (0 if already there)
export function pagesToStage(stage, totalPages) {
  const need = LEVEL_THRESHOLDS[stage.minLevel - 1];
  return Math.max(0, need - (Number(totalPages) || 0));
}

// when each level (2..현재) was reached: walk completed books in reading-
// completion order, accumulate pages (EXP), and record the book's date at
// each level threshold crossing. returns [{ level, date, stage }].
export function levelHistory(doneBooks) {
  const items = doneBooks
    .map((b) => {
      const pages = Number(b.pages) || 0;
      const raw = b.finish_date || b.start_date || b.created_at || null;
      return { pages, date: raw ? String(raw).slice(0, 10) : null };
    })
    .filter((x) => x.pages > 0)
    .sort((a, b) => {
      if (a.date === b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return a.date < b.date ? -1 : 1;
    });

  const history = [];
  let cum = 0;
  let nextIdx = 1; // next threshold to cross: LEVEL_THRESHOLDS[1] === Lv.2
  for (const it of items) {
    cum += it.pages;
    while (nextIdx < LEVEL_THRESHOLDS.length && cum >= LEVEL_THRESHOLDS[nextIdx]) {
      const level = nextIdx + 1;
      history.push({ level, date: it.date, stage: characterStageFor(level) });
      nextIdx += 1;
    }
  }
  return history;
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
