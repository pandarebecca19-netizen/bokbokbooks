"use client";

import { levelProgress, characterStageFor } from "../../lib/character";

export default function CharacterCard({ totalPages }) {
  const p = levelProgress(totalPages);
  const stage = characterStageFor(p.level);

  return (
    <div>
      <style>{`
        @keyframes char-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        .char-bob { animation: char-bob 2.4s ease-in-out infinite; }
      `}</style>

      <p className="font-serif text-lg text-ink mb-3">내 캐릭터</p>

      <div className="bg-card rounded-xl2 shadow-card px-5 py-5 flex items-center gap-5">
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
              ? `최고 레벨 · 지금까지 ${p.exp.toLocaleString("ko-KR")}쪽 읽음`
              : `다음 레벨까지 ${p.toNext.toLocaleString("ko-KR")}쪽 · 지금까지 ${p.exp.toLocaleString("ko-KR")}쪽`}
          </p>
        </div>
      </div>
    </div>
  );
}
