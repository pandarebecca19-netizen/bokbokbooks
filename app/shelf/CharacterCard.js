"use client";

import { useState } from "react";
import {
  LEVELS,
  levelProgress,
  characterStageFor,
  nextStageFor,
  pagesToStage,
  levelHistory,
  heightCmFromPages,
  formatHeightCm,
} from "../../lib/character";
import { formatDate } from "../../lib/constants";

function CollectedBadge({ unlocked, stage }) {
  return (
    <div className="flex flex-col items-center gap-1 w-14">
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
          unlocked ? "bg-peach-500" : "bg-rose-50"
        }`}
      >
        {unlocked ? stage.emoji : "🔒"}
      </div>
      <span className={`text-[0.58rem] text-center leading-tight ${unlocked ? "text-ink" : "text-muted"}`}>
        {stage.name}
      </span>
    </div>
  );
}

function CharacterDetail({ books, totalPages, onClose }) {
  const p = levelProgress(totalPages);
  const stage = characterStageFor(p.level);
  const nextStage = nextStageFor(p.level);
  const doneBooks = books.filter((b) => b.status === "done");
  const history = levelHistory(doneBooks);

  // Lv.0(시작) + 각 레벨 달성 기록
  const rows = [{ level: 0, date: null, stage: characterStageFor(0), isStart: true }, ...history];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 px-6" onClick={onClose}>
      <div
        className="bg-card rounded-xl2 shadow-soft p-6 w-full max-w-md max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-4 mb-4">
          <span className="text-5xl" style={{ lineHeight: 1 }}>{stage.emoji}</span>
          <div>
            <p className="font-serif text-xl text-ink">Lv.{p.level} · {stage.name}</p>
            <p className="text-xs text-muted mt-0.5">
              지금까지 {p.exp.toLocaleString("ko-KR")}쪽 · 쌓으면 약 {formatHeightCm(heightCmFromPages(p.exp))}
            </p>
          </div>
        </div>

        <p className="text-sm text-ink font-medium mb-2">레벨 기록</p>
        <div className="border border-rose-100 rounded-lg divide-y divide-rose-50">
          {rows.map((r) => (
            <div key={r.level} className="flex items-center gap-3 px-3 py-2">
              <span className="text-xl w-7 text-center">{r.stage.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-ink">
                  Lv.{r.level} · {r.stage.name}
                </p>
                {r.stage.pages > 0 && (
                  <p className="text-[0.65rem] text-muted">약 {formatHeightCm(heightCmFromPages(r.stage.pages))}</p>
                )}
              </div>
              <span className="text-[0.7rem] text-muted whitespace-nowrap">
                {r.isStart ? "시작" : r.date ? formatDate(r.date) : "—"}
              </span>
            </div>
          ))}
        </div>

        <p className="text-sm text-ink font-medium mt-5 mb-2">
          캐릭터 도감 ({p.level + 1}/{LEVELS.length})
        </p>
        <div className="flex flex-wrap gap-2">
          {LEVELS.map((l) => (
            <CollectedBadge key={l.level} unlocked={l.level <= p.level} stage={l} />
          ))}
        </div>

        <p className="text-sm text-ink font-medium mt-5 mb-2">다음 캐릭터</p>
        {nextStage ? (
          <div className="flex items-center gap-4 bg-rose-50 rounded-lg px-4 py-3">
            <span className="text-4xl" style={{ lineHeight: 1, filter: "brightness(0)", opacity: 0.28 }}>
              {nextStage.emoji}
            </span>
            <div>
              <p className="text-sm text-ink">
                {nextStage.name} (약 {formatHeightCm(heightCmFromPages(nextStage.pages))}) 만나면 달성이에요
              </p>
              <p className="text-[0.7rem] text-muted mt-0.5">
                {pagesToStage(nextStage, totalPages).toLocaleString("ko-KR")}쪽 더 읽으면 돼요
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted">최고 단계에 도달했어요 🎉</p>
        )}

        <div className="flex justify-end mt-6">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-rose-100 text-muted text-sm">
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CharacterCard({ books, totalPages }) {
  const [open, setOpen] = useState(false);
  const p = levelProgress(totalPages);
  const stage = characterStageFor(p.level);

  return (
    <div>
      <style>{`
        @keyframes char-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        .char-bob { animation: char-bob 2.4s ease-in-out infinite; }
      `}</style>

      <p className="font-serif text-lg text-ink mb-3">내 캐릭터</p>

      <button
        onClick={() => setOpen(true)}
        className="w-full text-left bg-card rounded-xl2 border border-rose-100 shadow-card px-5 py-5 flex items-center gap-5 hover:-translate-y-0.5 hover:shadow-soft transition"
      >
        <div className="text-5xl shrink-0 char-bob" style={{ lineHeight: 1 }}>
          {stage.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-serif text-lg text-ink">
            Lv.{p.level} · {stage.name}
          </p>
          <div className="mt-2 h-2 rounded-full bg-rose-50 overflow-hidden">
            <div
              className="h-full bg-peach-500 rounded-full transition-all"
              style={{ width: `${p.percent}%` }}
            />
          </div>
          <p className="text-[0.68rem] text-muted mt-1">
            {p.isMax
              ? `최고 레벨 · 쌓은 높이 약 ${formatHeightCm(heightCmFromPages(p.exp))}`
              : `다음 레벨까지 ${p.toNext.toLocaleString("ko-KR")}쪽 · 쌓은 높이 약 ${formatHeightCm(heightCmFromPages(p.exp))}`}
          </p>
          <p className="text-[0.62rem] text-peach-500 mt-1.5">눌러서 성장 기록 보기</p>
        </div>
      </button>

      {open && <CharacterDetail books={books} totalPages={totalPages} onClose={() => setOpen(false)} />}
    </div>
  );
}
