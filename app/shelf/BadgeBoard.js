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

// 화면에는 아무것도 그리지 않고, 1000쪽 단위 배지를 새로 얻을 때마다 축하
// 팝업만 띄운다. 실제 배지 그리드는 BadgeCollection에 있다.
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

  return <CelebrationPopup item={celebrate} onClose={() => setCelebrate(null)} />;
}
