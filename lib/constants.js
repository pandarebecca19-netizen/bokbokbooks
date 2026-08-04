const SPINE_H = 190;

// muted, dusty pastel — used for the book's own spine color
export const COLOR_SWATCHES = [
  { key: "rose", label: "로즈", base: "#D9AEA8" },
  { key: "terracotta", label: "테라코타", base: "#D6AE8B" },
  { key: "mustard", label: "머스타드", base: "#D3C48F" },
  { key: "sage", label: "세이지", base: "#A9BB9E" },
  { key: "dustyblue", label: "더스티블루", base: "#9BB0C1" },
  { key: "denim", label: "데님", base: "#8E97B5" },
  { key: "lavender", label: "라벤더", base: "#B29FBA" },
  { key: "walnut", label: "월넛", base: "#AD8862" },
  { key: "stone", label: "스톤", base: "#ACA89F" },
  { key: "ivory", label: "아이보리", base: "#EDE4D0" },
];

// same palette offered when a person picks a color for a new genre
export const GENRE_SWATCHES = COLOR_SWATCHES;

export const STATUS = {
  want: { label: "읽고 싶어요" },
  reading: { label: "읽는 중이에요" },
  done: { label: "다 읽었어요" },
};

export function swatchFor(colorKey) {
  return COLOR_SWATCHES.find((s) => s.key === colorKey) || null;
}

function hexToRgb(hex) {
  const m = hex.replace("#", "");
  return {
    r: parseInt(m.substring(0, 2), 16),
    g: parseInt(m.substring(2, 4), 16),
    b: parseInt(m.substring(4, 6), 16),
  };
}

export function darken(hex, amt) {
  const { r, g, b } = hexToRgb(hex);
  const d = (c) => Math.max(0, Math.round(c * (1 - amt)));
  return `rgb(${d(r)}, ${d(g)}, ${d(b)})`;
}

export function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function spineColorFor(book) {
  const chosen = swatchFor(book.color_key);
  if (chosen) return { base: chosen.base, deep: darken(chosen.base, 0.3) };
  const h = hashStr((book.title || "") + (book.author || ""));
  const fallback = COLOR_SWATCHES[h % COLOR_SWATCHES.length];
  return { base: fallback.base, deep: darken(fallback.base, 0.3) };
}

// on the wooden shelf, books that aren't finished yet ("읽고 싶어요" /
// "읽는 중") show as a plain off-white spine regardless of their chosen
// color — only "다 읽었어요" books show their real color there.
const SHELF_UNREAD_BASE = "#F5F1E8";

export function shelfSpineColorFor(book) {
  if (book.status !== "done") {
    return { base: SHELF_UNREAD_BASE, deep: darken(SHELF_UNREAD_BASE, 0.3) };
  }
  return spineColorFor(book);
}

// current_page / pages -> { current, total, percent }, or null when
// there's no total page count to measure progress against.
export function readingProgress(book) {
  const total = Number(book.pages) || 0;
  if (!total) return null;
  const current = Math.max(0, Math.min(total, Number(book.current_page) || 0));
  const percent = Math.round((current / total) * 100);
  return { current, total, percent };
}

// case/whitespace-insensitive substring match against title or author
export function matchesSearch(book, query) {
  const q = query.trim().toLowerCase().replace(/\s+/g, "");
  if (!q) return true;
  const norm = (s) => (s || "").toLowerCase().replace(/\s+/g, "");
  return norm(book.title).includes(q) || norm(book.author).includes(q);
}

// spine width needs to fit both the page-count-based thickness AND
// however many vertical text columns the title needs to fully show
// (long titles wrap into extra columns instead of getting truncated)
export function spineWidthFor(book) {
  const pages = Number(book.pages) || 0;
  const pagesWidth = 28 + Math.min(pages / 9, 46);

  const titleLen = (book.title || "").length;
  const charsPerColumn = Math.max(1, Math.floor((SPINE_H - 60) / 15));
  const columnsNeeded = Math.max(1, Math.ceil(titleLen / charsPerColumn));
  const widthForTitle = columnsNeeded * 18 + 14;

  return Math.round(Math.max(pagesWidth, widthForTitle));
}

// mobile version of spineWidthFor: roughly half the thickness so ~6-8
// spines fit per row on a phone-width shelf. Column sizing matches the
// smaller mobile spine title font (see the shelf title text-[0.62rem]).
export function spineWidthForMobile(book) {
  const pages = Number(book.pages) || 0;
  const pagesWidth = 16 + Math.min(pages / 14, 26);

  const titleLen = (book.title || "").length;
  const charsPerColumn = Math.max(1, Math.floor((SPINE_H - 40) / 12));
  const columnsNeeded = Math.max(1, Math.ceil(titleLen / charsPerColumn));
  const widthForTitle = columnsNeeded * 14 + 10;

  return Math.round(Math.max(pagesWidth, widthForTitle));
}

// build a genre -> color map from the person's own books, so picking
// a genre they've used before always reuses the same color
export function deriveGenreColors(books) {
  const map = {};
  books.forEach((b) => {
    const key = (b.genre || "").trim();
    if (key && !map[key]) map[key] = b.genre_color || COLOR_SWATCHES[0].base;
  });
  return map;
}

// "YYYY-MM-DD" from <input type="date"> — parse manually so we never
// shift a date across a timezone/UTC boundary.
export function parseDateOnly(s) {
  if (!s || typeof s !== "string") return null;
  const parts = s.split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
  const [y, m, day] = parts;
  return { y, m, day };
}

export function formatDate(d) {
  const parsed = parseDateOnly(d);
  if (!parsed) return "";
  const dt = new Date(parsed.y, parsed.m - 1, parsed.day);
  return dt.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function getFinishYear(book) {
  const dateOnly =
    parseDateOnly(book.finish_date) || parseDateOnly(book.start_date);
  if (dateOnly) return dateOnly.y;
  if (book.created_at) {
    const y = new Date(book.created_at).getFullYear();
    return Number.isNaN(y) ? null : y;
  }
  return null;
}

// "전체보기" list sort. Default ("finish_desc") surfaces finished books
// by finish date first (most recent on top), then everything without a
// finish date (reading / want-to-read) grouped below by when it was added.
function dateValue(dateOnly) {
  if (!dateOnly) return null;
  return dateOnly.y * 10000 + dateOnly.m * 100 + dateOnly.day;
}

export const SORT_OPTIONS = [
  { key: "finish_desc", label: "완독일 최신순" },
  { key: "created_desc", label: "최신 저장일순" },
  { key: "title_asc", label: "제목순" },
];

export function sortBooks(books, sortKey) {
  const list = [...books];
  if (sortKey === "title_asc") {
    return list.sort((a, b) => (a.title || "").localeCompare(b.title || "", "ko"));
  }
  if (sortKey === "created_desc") {
    return list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }
  return list.sort((a, b) => {
    const fa = a.status === "done" ? dateValue(parseDateOnly(a.finish_date)) : null;
    const fb = b.status === "done" ? dateValue(parseDateOnly(b.finish_date)) : null;
    if (fa !== null && fb !== null) return fb - fa;
    if (fa !== null) return -1;
    if (fb !== null) return 1;
    return new Date(b.created_at) - new Date(a.created_at);
  });
}

// ---- reading distance: 1000 pages read ("다 읽었어요" books) = 1km ----
export function readingDistanceKm(totalPages) {
  return (Number(totalPages) || 0) / 1000;
}

function roundKm(n) {
  return Math.round(n * 1000) / 1000;
}

export function formatKm(km) {
  if (km < 0.1) return km.toFixed(3);
  if (km < 10) return km.toFixed(2);
  return km.toFixed(1);
}

// checkpoints: every 0.5km up to 2km, then every 1km after — used to
// pace the small "character steps forward" animation on the track.
export function checkpointIndex(km) {
  if (km <= 0) return 0;
  if (km < 2) return Math.floor(km / 0.5);
  return 4 + Math.floor(km - 2);
}

export function checkpointKmAt(index) {
  return index <= 4 ? roundKm(index * 0.5) : roundKm(2 + (index - 4));
}

export function lastCheckpointKm(km) {
  return checkpointKmAt(checkpointIndex(km));
}

export function nextCheckpointKm(km) {
  return checkpointKmAt(checkpointIndex(km) + 1);
}

// named landmarks the reading-distance character passes on the way up
// (climbing) or down (diving) — approximate real-world elevations/depths.
export const CLIMB_LANDMARKS = [
  { km: 0.48, label: "N서울타워 전망대" },
  { km: 1.708, label: "설악산 대청봉" },
  { km: 1.947, label: "한라산 정상" },
  { km: 2.744, label: "백두산 정상" },
  { km: 3.776, label: "후지산 정상" },
  { km: 5.895, label: "킬리만자로 정상" },
  { km: 8.849, label: "에베레스트 정상", note: "지구에서 가장 높은 산" },
  { km: 11, label: "여객기 순항 고도" },
  { km: 12, label: "성층권 진입 고도" },
  { km: 400, label: "국제우주정거장(ISS) 궤도" },
];

export const DIVE_LANDMARKS = [
  { km: 0.02, label: "서울 지하철 평균 깊이" },
  { km: 0.04, label: "레저 스쿠버다이빙 한계 수심" },
  { km: 0.3, label: "잠수함 작전 심도" },
  { km: 3.8, label: "타이타닉 잔해 수심" },
  { km: 10.935, label: "마리아나 해구 챌린저 해연", note: "지구에서 가장 깊은 지점" },
  { km: 35, label: "지각 평균 두께" },
  { km: 100, label: "맨틀 상부" },
];

// which landmark was last passed and which is next, given the current
// distance — walks the list once since it's always short and sorted.
export function landmarkProgress(km, landmarks) {
  let passed = null;
  let next = null;
  for (const lm of landmarks) {
    if (lm.km <= km) passed = lm;
    else {
      next = lm;
      break;
    }
  }
  return { passed, next, beyondAll: !next };
}

// where the character sits (0-100%) within the current landmark segment,
// stepped by checkpoint index rather than raw km so a 0.8km segment and
// a 388km segment both fill the same track and advance in even steps.
export function trackPosition(km, landmarks) {
  const { passed, next, beyondAll } = landmarkProgress(km, landmarks);
  if (beyondAll) return { passed, next, beyondAll, percent: 96 };

  const startKm = passed ? passed.km : 0;
  const startIdx = checkpointIndex(startKm);
  const endIdx = Math.max(startIdx + 1, checkpointIndex(next.km));
  const curIdx = checkpointIndex(km);
  const percent = Math.max(0, Math.min(100, ((curIdx - startIdx) / (endIdx - startIdx)) * 100));
  return { passed, next, beyondAll, percent };
}

export { SPINE_H };
