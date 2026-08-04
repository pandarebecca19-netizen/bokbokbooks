// ---- "지식의 숲" (forest of knowledge) domain logic ----
//
// A completed book IS a tree — its look (plant type / size / position)
// is always derived live from the book row (genre / pages / id), the
// same way spineColorFor() derives a spine's look from a book. There is
// no separate `trees` table, so nothing can ever get out of sync with
// the book it came from.
//
// The forest's aggregate stats (total_books_count / total_pages_read /
// points on `profiles`) are NOT computed here — they're kept correct by
// a Postgres trigger (see supabase/migration_forest.sql) that
// recomputes them from `books` on every insert/update/delete. This
// module only turns those numbers into a forest level, and turns a book
// into a tree.

export const FOREST_LEVELS = [
  { level: 1, name: "씨앗의 화원", minPages: 0, maxPages: 2500, features: "작은 정원, 화분, 오솔길" },
  { level: 2, name: "초록빛 쉼터", minPages: 2501, maxPages: 8000, features: "잔디밭 확장, 쉼터 벤치" },
  { level: 3, name: "울창한 숲", minPages: 8001, maxPages: 20000, features: "연못, 밤/낮 그래픽 적용" },
  { level: 4, name: "깊은 산림", minPages: 20001, maxPages: 45000, features: "안개/반딧불이 이펙트, 돌길" },
  { level: 5, name: "태고의 정원", minPages: 45001, maxPages: 90000, features: "폭포/계곡 지형, 야생 동물 등장" },
  { level: 6, name: "지식의 아르카디아", minPages: 90001, maxPages: 150000, features: "신비로운 오두막/유적" },
  { level: 7, name: "완벽한 지식의 세계수", minPages: 150001, maxPages: Infinity, features: "중앙 거대 세계수, 테마 커스텀 해금" },
];

export function forestLevelFor(totalPagesRead) {
  const pages = Number(totalPagesRead) || 0;
  return (
    FOREST_LEVELS.find((l) => pages >= l.minPages && pages <= l.maxPages) ||
    FOREST_LEVELS[FOREST_LEVELS.length - 1]
  );
}

// null once already at the max level
export function nextForestLevel(totalPagesRead) {
  const current = forestLevelFor(totalPagesRead);
  return FOREST_LEVELS.find((l) => l.level === current.level + 1) || null;
}

export function pagesToNextLevel(totalPagesRead) {
  const next = nextForestLevel(totalPagesRead);
  if (!next) return 0;
  return Math.max(0, next.minPages - (Number(totalPagesRead) || 0));
}

function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

// genre -> plant type, by keyword match. an unrecognized/blank genre
// still always maps to the same plant (hashed), so it's stable.
const GENRE_PLANT_MAP = [
  { match: ["소설", "문학", "SF", "판타지", "추리", "로맨스"], type: "cherry", label: "벚나무" },
  { match: ["인문", "철학", "역사", "사회", "종교"], type: "oak", label: "참나무" },
  { match: ["자기계발", "경제", "경영", "실용", "재테크"], type: "bamboo", label: "대나무" },
  { match: ["에세이", "시", "예술", "여행"], type: "wildflower", label: "들꽃" },
];
const FALLBACK_PLANTS = [
  { type: "cherry", label: "벚나무" },
  { type: "oak", label: "참나무" },
  { type: "bamboo", label: "대나무" },
  { type: "wildflower", label: "들꽃" },
];

export function plantTypeForGenre(genre) {
  const g = (genre || "").trim();
  if (g) {
    const found = GENRE_PLANT_MAP.find((entry) => entry.match.some((m) => g.includes(m)));
    if (found) return { type: found.type, label: found.label };
  }
  return FALLBACK_PLANTS[hashStr(g || "미분류") % FALLBACK_PLANTS.length];
}

// page count -> tree size tier
export function plantScaleFor(pageCount) {
  const p = Number(pageCount) || 0;
  if (p <= 150) return { scale: "small", label: "작은 화분/관목" };
  if (p <= 400) return { scale: "medium", label: "일반 성목" };
  if (p <= 700) return { scale: "large", label: "대형 고목" };
  return { scale: "epic", label: "거대 세계수" };
}

// reading progress (0-100) -> growth stage, for a book still being read
export function growthStageFor(percent) {
  const p = Math.max(0, Math.min(100, Number(percent) || 0));
  if (p >= 100) return "mature";
  if (p >= 75) return "blooming";
  if (p >= 50) return "sapling";
  if (p >= 25) return "sprout";
  return "seed";
}

// stable pseudo-random (0-1, 0-1) spot for a book's tree, so it always
// lands in the same place in the forest grid without storing a position.
export function gridPositionFor(bookId) {
  const h = hashStr(String(bookId));
  return { x: (h % 1000) / 1000, y: ((h >>> 10) % 1000) / 1000 };
}

// everything needed to render a completed book as a tree in the forest
export function treeForBook(book) {
  const plant = plantTypeForGenre(book.genre);
  const scale = plantScaleFor(book.pages);
  return {
    bookId: book.id,
    plantType: plant.type,
    plantLabel: plant.label,
    plantScale: scale.scale,
    plantScaleLabel: scale.label,
    growthStage: "mature",
    position: gridPositionFor(book.id),
  };
}

// mirrors the points formula in migration_forest.sql's
// recompute_forest_profile() — for optimistic/offline display only.
// profiles.points (kept correct by the DB trigger) is the source of truth.
export function estimatedPoints(totalBooksCount, totalPagesRead) {
  return Math.round((Number(totalBooksCount) || 0) * 100 + (Number(totalPagesRead) || 0) * 0.5);
}
