"use client";

import { useState } from "react";
import { LEVELS, levelProgress } from "../../lib/character";
import {
  PAGE_BADGE_STEP,
  pageBadgeCount,
  GENRE_BOOK_BADGE_STEP,
  genreBadgeCount,
  countByGenre,
} from "../../lib/badges";

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

function CharacterBadgeGrid({ totalPages }) {
  const p = levelProgress(totalPages);
  return (
    <div>
      <p className="text-sm text-ink font-medium mb-3">
        캐릭터 도감 ({p.level + 1}/{LEVELS.length})
      </p>
      <div className="flex flex-wrap gap-2">
        {LEVELS.map((l) => (
          <Badge key={l.level} earned={l.level <= p.level} icon={l.emoji} label={l.name} />
        ))}
      </div>
    </div>
  );
}

function PageBadgeGrid({ totalPages }) {
  const pageCount = pageBadgeCount(totalPages);
  const badges = Array.from({ length: pageCount }, (_, i) => (i + 1) * PAGE_BADGE_STEP);
  const nextMilestone = (pageCount + 1) * PAGE_BADGE_STEP;
  const remaining = Math.max(0, nextMilestone - totalPages);

  return (
    <div>
      <p className="text-sm text-ink font-medium mb-3">전체 페이지 배지</p>
      <div className="flex gap-2 flex-wrap">
        {badges.map((m) => (
          <Badge key={m} earned icon="📖" label={`${m.toLocaleString("ko-KR")}쪽`} />
        ))}
        <Badge earned={false} icon="📖" label={`${nextMilestone.toLocaleString("ko-KR")}쪽`} />
      </div>
      <p className="text-[0.68rem] text-muted mt-2">
        다음 배지까지 {remaining.toLocaleString("ko-KR")}쪽
      </p>
    </div>
  );
}

function GenreBadgeGrid({ doneBooks, genreColors }) {
  const counts = countByGenre(doneBooks);
  const genreNames = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
  const [selected, setSelected] = useState(genreNames[0] || null);

  if (genreNames.length === 0) {
    return <p className="text-sm text-muted">아직 다 읽은 책이 없어요.</p>;
  }

  const current = counts[selected] !== undefined ? selected : genreNames[0];
  const count = counts[current] || 0;
  const badgeCount = genreBadgeCount(count);
  const badges = Array.from({ length: badgeCount }, (_, i) => (i + 1) * GENRE_BOOK_BADGE_STEP);
  const nextMilestone = (badgeCount + 1) * GENRE_BOOK_BADGE_STEP;
  const remaining = Math.max(0, nextMilestone - count);

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {genreNames.map((g) => (
          <button
            key={g}
            onClick={() => setSelected(g)}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition ${
              current === g
                ? "bg-navy border-navy text-white"
                : "bg-card border-rose-100 text-muted hover:border-peach-300"
            }`}
          >
            {genreColors[g] && (
              <span className="w-2 h-2 rounded-full" style={{ background: genreColors[g] }} />
            )}
            {g}
          </button>
        ))}
      </div>
      <p className="text-sm text-ink font-medium mb-3">{current} 배지</p>
      <div className="flex gap-2 flex-wrap">
        {badges.map((m) => (
          <Badge key={m} earned icon="🏷️" label={`${m.toLocaleString("ko-KR")}권`} />
        ))}
        <Badge earned={false} icon="🏷️" label={`${nextMilestone.toLocaleString("ko-KR")}권`} />
      </div>
      <p className="text-[0.68rem] text-muted mt-2">
        다음 배지까지 {remaining.toLocaleString("ko-KR")}권
      </p>
    </div>
  );
}

const CATEGORIES = [
  { key: "character", label: "캐릭터 배지" },
  { key: "pages", label: "페이지수 배지" },
  { key: "genre", label: "장르별 배지" },
];

function BadgeModal({ totalPages, doneBooks, genreColors, onClose }) {
  const [category, setCategory] = useState("character");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 px-6" onClick={onClose}>
      <div
        className="bg-card rounded-xl2 shadow-soft p-6 w-full max-w-md max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="font-serif text-lg text-ink mb-3">배지 모아보기</p>

        <div className="flex gap-1 bg-rose-50 rounded-full p-1 mb-4">
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              onClick={() => setCategory(c.key)}
              className={`flex-1 px-2 py-1.5 rounded-full text-xs transition ${
                category === c.key ? "bg-navy text-white" : "text-muted"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {category === "character" && <CharacterBadgeGrid totalPages={totalPages} />}
        {category === "pages" && <PageBadgeGrid totalPages={totalPages} />}
        {category === "genre" && <GenreBadgeGrid doneBooks={doneBooks} genreColors={genreColors} />}

        <div className="flex justify-end mt-6">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-rose-100 text-muted text-sm">
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BadgeCollection({ totalPages, doneBooks, genreColors }) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        onClick={() => setOpen(true)}
        className="w-full text-left bg-card rounded-xl2 shadow-card px-5 py-5 flex items-center gap-4 hover:-translate-y-0.5 transition"
      >
        <span className="text-3xl" style={{ lineHeight: 1 }}>
          🏅
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-serif text-lg text-ink">배지 모아보기</p>
          <p className="text-[0.68rem] text-muted mt-0.5">캐릭터 · 페이지수 · 장르별 배지를 한눈에 확인해요</p>
        </div>
        <span className="text-muted">›</span>
      </button>

      {open && (
        <BadgeModal
          totalPages={totalPages}
          doneBooks={doneBooks}
          genreColors={genreColors}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
