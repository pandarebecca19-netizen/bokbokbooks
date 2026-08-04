"use client";

import { useEffect, useState } from "react";
import { PAGE_BADGE_STEP, pageBadgeCount } from "../../lib/badges";

const SEEN_PAGE_KEY = "badges-seen-page-count";

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

export default function BadgeBoard({ totalPages }) {
  const [celebrate, setCelebrate] = useState(null);
  const pageCount = pageBadgeCount(totalPages);

  useEffect(() => {
    const seenPage = loadNumber(SEEN_PAGE_KEY);
    if (pageCount > seenPage) {
      setCelebrate({
        label: `${(pageCount * PAGE_BADGE_STEP).toLocaleString("ko-KR")}쪽`,
        sub: "전체 페이지 배지",
      });
      saveNumber(SEEN_PAGE_KEY, pageCount);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageCount]);

  const badges = Array.from({ length: pageCount }, (_, i) => (i + 1) * PAGE_BADGE_STEP);
  const nextMilestone = (pageCount + 1) * PAGE_BADGE_STEP;
  const remaining = Math.max(0, nextMilestone - totalPages);

  return (
    <div>
      <CelebrationPopup item={celebrate} onClose={() => setCelebrate(null)} />
      <p className="font-serif text-lg text-ink mb-3">배지</p>
      <div className="bg-card rounded-xl2 shadow-card px-4 py-4">
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
    </div>
  );
}
