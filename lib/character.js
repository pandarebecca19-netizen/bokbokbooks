// ---- character growth (EXP = total pages read) ----
// 읽은 쪽수를 종이처럼 차곡차곡 쌓았을 때 어느 정도 높이가 될지 계산하고,
// 그 높이와 비슷한 실제 물체/동물을 캐릭터로 보여준다. (책 1쪽 ≈ 0.12mm로 계산)
// 레벨 = 캐릭터: 레벨업할 때마다 캐릭터도 항상 같이 바뀐다.

export const PAGE_HEIGHT_MM = 0.12;

// 누적 쪽수 -> 쌓은 높이(cm)
export function heightCmFromPages(pages) {
  const p = Number(pages) || 0;
  return (p * PAGE_HEIGHT_MM) / 10;
}

// "312cm" -> "3.1m" 처럼 사람이 읽기 좋은 단위로 표시
export function formatHeightCm(cm) {
  const c = Number(cm) || 0;
  if (c < 100) return `${Math.round(c * 10) / 10}cm`;
  return `${(c / 100).toFixed(1)}m`;
}

// 레벨별 목표 쪽수와, 그 높이와 닮은 물체/동물. 200 -> 500 -> 1000쪽까지는
// 1000쪽 단위, 5000쪽 이후로는 2500쪽 단위로 100,000쪽까지 촘촘하게 올라간다.
export const LEVELS = [
  { level: 0, pages: 0, emoji: "🌱", name: "이제 시작" },
  { level: 1, pages: 200, emoji: "🍬", name: "사탕 한 알" },
  { level: 2, pages: 500, emoji: "🍓", name: "딸기 한 알" },
  { level: 3, pages: 1000, emoji: "🐹", name: "햄스터" },
  { level: 4, pages: 2000, emoji: "🥤", name: "텀블러" },
  { level: 5, pages: 3000, emoji: "🐈", name: "고양이" },
  { level: 6, pages: 4000, emoji: "🦆", name: "오리" },
  { level: 7, pages: 5000, emoji: "🐕", name: "강아지" },
  { level: 8, pages: 7500, emoji: "🐧", name: "킹펭귄" },
  { level: 9, pages: 10000, emoji: "🦩", name: "홍학" },
  { level: 10, pages: 12500, emoji: "🦘", name: "캥거루" },
  { level: 11, pages: 15000, emoji: "🏄", name: "서프보드" },
  { level: 12, pages: 17500, emoji: "🚪", name: "현관문" },
  { level: 13, pages: 20000, emoji: "🎄", name: "크리스마스트리" },
  { level: 14, pages: 22500, emoji: "🛶", name: "카누" },
  { level: 15, pages: 25000, emoji: "🏀", name: "농구 골대" },
  { level: 16, pages: 27500, emoji: "🐘", name: "코끼리" },
  { level: 17, pages: 30000, emoji: "🚌", name: "버스" },
  { level: 18, pages: 32500, emoji: "🚚", name: "트럭" },
  { level: 19, pages: 35000, emoji: "⛵", name: "돛단배" },
  { level: 20, pages: 37500, emoji: "🌲", name: "소나무" },
  { level: 21, pages: 40000, emoji: "🦒", name: "기린" },
  { level: 22, pages: 42500, emoji: "🚏", name: "버스 정류장" },
  { level: 23, pages: 45000, emoji: "🏠", name: "단층 주택" },
  { level: 24, pages: 47500, emoji: "🌳", name: "느티나무" },
  { level: 25, pages: 50000, emoji: "🚨", name: "소방차" },
  { level: 26, pages: 52500, emoji: "⛴️", name: "여객선" },
  { level: 27, pages: 55000, emoji: "🎪", name: "서커스 천막" },
  { level: 28, pages: 57500, emoji: "🏢", name: "2층 건물" },
  { level: 29, pages: 60000, emoji: "🛥️", name: "요트" },
  { level: 30, pages: 62500, emoji: "🌴", name: "야자나무" },
  { level: 31, pages: 65000, emoji: "🎡", name: "회전목마" },
  { level: 32, pages: 67500, emoji: "🚂", name: "기차 객차" },
  { level: 33, pages: 70000, emoji: "🏢", name: "3층 건물" },
  { level: 34, pages: 72500, emoji: "🌲", name: "전나무" },
  { level: 35, pages: 75000, emoji: "🏢", name: "4층 건물" },
  { level: 36, pages: 77500, emoji: "📡", name: "통신탑" },
  { level: 37, pages: 80000, emoji: "🚢", name: "화물선" },
  { level: 38, pages: 82500, emoji: "🏗️", name: "크레인" },
  { level: 39, pages: 85000, emoji: "🏢", name: "5층 건물" },
  { level: 40, pages: 87500, emoji: "🌉", name: "다리 교각" },
  { level: 41, pages: 90000, emoji: "🎢", name: "롤러코스터" },
  { level: 42, pages: 92500, emoji: "🏢", name: "6층 건물" },
  { level: 43, pages: 95000, emoji: "🚀", name: "소형 로켓" },
  { level: 44, pages: 97500, emoji: "🗼", name: "등대" },
  { level: 45, pages: 100000, emoji: "🔌", name: "전봇대" },
];

export const LEVEL_THRESHOLDS = LEVELS.map((l) => l.pages);
// 레벨이 0부터 시작하므로 "최고 레벨"은 배열 길이가 아니라 마지막 항목의 level 값
export const MAX_LEVEL = LEVELS[LEVELS.length - 1].level;

export function levelFromExp(exp) {
  const e = Number(exp) || 0;
  let level = 0;
  for (const l of LEVELS) {
    if (e >= l.pages) level = l.level;
  }
  return level;
}

export function characterStageFor(level) {
  return LEVELS.find((l) => l.level === level) || LEVELS[0];
}

// the next growth stage after the current level (null if already final)
export function nextStageFor(level) {
  return LEVELS.find((l) => l.level === level + 1) || null;
}

// pages of EXP still needed to reach a given stage (0 if already there)
export function pagesToStage(stage, totalPages) {
  return Math.max(0, stage.pages - (Number(totalPages) || 0));
}

// when each level (1..현재) was reached: walk completed books in reading-
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
  let nextIdx = 1; // next threshold to cross: LEVELS[1] === Lv.1 (LEVELS[0] === Lv.0, the start)
  for (const it of items) {
    cum += it.pages;
    while (nextIdx < LEVELS.length && cum >= LEVELS[nextIdx].pages) {
      history.push({ level: LEVELS[nextIdx].level, date: it.date, stage: LEVELS[nextIdx] });
      nextIdx += 1;
    }
  }
  return history;
}

// progress within the current level toward the next. LEVELS is 0-based and
// contiguous (LEVELS[i].level === i), so the array index doubles as the level.
export function levelProgress(exp) {
  const e = Number(exp) || 0;
  const level = levelFromExp(e);
  const curBase = LEVELS[level].pages;
  if (level >= MAX_LEVEL) {
    return { level, exp: e, percent: 100, toNext: 0, isMax: true };
  }
  const nextBase = LEVELS[level + 1].pages;
  const percent = Math.min(100, Math.round(((e - curBase) / (nextBase - curBase)) * 100));
  return { level, exp: e, percent, toNext: nextBase - e, isMax: false };
}
