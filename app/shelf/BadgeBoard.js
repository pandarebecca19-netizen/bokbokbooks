"use client";

import { useEffect, useState } from "react";
import {
  PAGE_BADGE_STEP,
  GENRE_BOOK_BADGE_STEP,
  pageBadgeCount,
  genreBadgeCount,
  countByGenre,
} from "../../lib/badges";

const SEEN_PAGE_KEY = "badges-seen-page-count";
const SEEN_GENRE_KEY = "badges-seen-genre-counts";

function loadNumber(key) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? Number(raw) : 0;
  } catch {
    return 0;
  }
}

function saveNumber(key, value) {
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    // ignore storage failures (private mode, quota, etc.)
  }
}

function loadGenreSeen() {
  try {
    const raw = window.localStorage.getItem(SEEN_GENRE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveGenreSeen(obj) {
  try {
    window.localStorage.setItem(SEEN_GENRE_KEY, JSON.stringify(obj));
  } catch {
    // ignore storage failures
  }
}

function Badge({ earned, icon, label }) {
  return (
    <div className="flex flex-col items-center gap-1 w-16">
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
          earned ? "bg-peach-500" : "bg-rose-50"
        }`}
      >
        {earned ? icon : "🔒"}
      </div>
      <span className={`text-[0.6rem] text-center leading-tight ${earned ? "text-ink" : "text-muted"}`}>
        {label}
      </span>
    </div>
  );
}

function BadgeRow({ title, icon, count, step, unit, current }) {
  const badges = Array.from({ length: count }, (_, i) => (i + 1) * step);
  const nextMilestone = (count + 1) * step;
  const remaining = Math.max(0, nextMilestone - current);

  return (
    <div className="bg-card rounded-xl2 shadow-card px-4 py-4">
      <p className="text-sm text-ink font-medium mb-3">{title}</p>
      <div className="flex gap-2 flex-wrap">
        {badges.map((m) => (
          <Badge key={m} earned icon={icon} label={`${m.toLocaleString("ko-KR")}${unit}`} />
        ))}
        <Badge earned={false} icon={icon} label={`${nextMilestone.toLocaleString("ko-KR")}${unit}`} />
      </div>
      <p className="text-[0.68rem] text-muted mt-2">
        다음 배지까지 {remaining.toLocaleString("ko-KR")}{unit}
      </p>
    </div>
  );
}

function CelebrationPopup({ item, onClose }) {
  if (!item) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 px-6" onClick={onClose}>
      <div
        className="bg-card rounded-xl2 shadow-soft px-8 py-7 text-center max-w-xs w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-5xl mb-2">🎉</div>
        <p className="font-serif text-xl text-ink">{item.label} 배지 획득!</p>
        <p className="text-sm text-muted mt-2">{item.sub}</p>
        <button
          onClick={onClose}
          className="mt-5 px-5 py-2 rounded-lg bg-peach-500 hover:bg-peach-400 text-white text-sm font-medium"
        >
          확인
        </button>
      </div>
    </div>
  );
}

export default function BadgeBoard({ books, totalPages }) {
  const [queue, setQueue] = useState([]);
  const doneBooks = books.filter((b) => b.status === "done");
  const genreCounts = countByGenre(doneBooks);
  const pageCount = pageBadgeCount(totalPages);
  const genreCountsKey = JSON.stringify(genreCounts);

  useEffect(() => {
    const newItems = [];

    const seenPage = loadNumber(SEEN_PAGE_KEY);
    if (pageCount > seenPage) {
      newItems.push({
        label: `${(pageCount * PAGE_BADGE_STEP).toLocaleString("ko-KR")}쪽`,
        sub: "전체 페이지 배지",
      });
      saveNumber(SEEN_PAGE_KEY, pageCount);
    }

    const seenGenres = loadGenreSeen();
    let genresChanged = false;
    Object.entries(genreCounts).forEach(([genre, count]) => {
      const badgeCount = genreBadgeCount(count);
      const seen = seenGenres[genre] || 0;
      if (badgeCount > seen) {
        newItems.push({
          label: `${genre} ${(badgeCount * GENRE_BOOK_BADGE_STEP).toLocaleString("ko-KR")}권`,
          sub: "장르 배지",
        });
        seenGenres[genre] = badgeCount;
        genresChanged = true;
      }
    });
    if (genresChanged) saveGenreSeen(seenGenres);

    if (newItems.length > 0) setQueue((q) => [...q, ...newItems]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageCount, genreCountsKey]);

  const current = queue[0] || null;
  const dismiss = () => setQueue((q) => q.slice(1));

  const genreNames = Object.keys(genreCounts).sort((a, b) => genreCounts[b] - genreCounts[a]);

  return (
    <div>
      <CelebrationPopup item={current} onClose={dismiss} />
      <p className="font-serif text-lg text-ink mb-3">배지</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <BadgeRow
          title="전체 페이지 배지"
          icon="📖"
          count={pageCount}
          step={PAGE_BADGE_STEP}
          unit="쪽"
          current={totalPages}
        />
        {genreNames.map((genre) => (
          <BadgeRow
            key={genre}
            title={`${genre} 배지`}
            icon="🏷️"
            count={genreBadgeCount(genreCounts[genre])}
            step={GENRE_BOOK_BADGE_STEP}
            unit="권"
            current={genreCounts[genre]}
          />
        ))}
      </div>
    </div>
  );
}
