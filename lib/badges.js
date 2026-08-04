// ---- reading badges ----
// - overall: every 1000 pages read across all completed books
// - per genre: every 5 books completed within that genre (the badge is
//   labeled with the genre's own name)

export const PAGE_BADGE_STEP = 1000;
export const GENRE_BOOK_BADGE_STEP = 5;

export function pageBadgeCount(totalPages) {
  return Math.floor((Number(totalPages) || 0) / PAGE_BADGE_STEP);
}

export function genreBadgeCount(booksInGenre) {
  return Math.floor((Number(booksInGenre) || 0) / GENRE_BOOK_BADGE_STEP);
}

// { genre: count } of completed books — genre-less books group as "미분류",
// same fallback the rest of the app already uses (see GenresView).
export function countByGenre(doneBooks) {
  const counts = {};
  doneBooks.forEach((b) => {
    const g = (b.genre || "").trim() || "미분류";
    counts[g] = (counts[g] || 0) + 1;
  });
  return counts;
}
