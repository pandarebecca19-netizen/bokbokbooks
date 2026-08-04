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

export { SPINE_H };
