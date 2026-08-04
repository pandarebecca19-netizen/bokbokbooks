"use client";

import {
  forestLevelFor,
  nextForestLevel,
  pagesToNextLevel,
  plantTypeForGenre,
  plantScaleFor,
  growthStageFor,
  gridPositionFor,
  estimatedPoints,
} from "../../lib/forest";
import { readingProgress } from "../../lib/constants";

const PLANT_EMOJI = { cherry: "🌸", oak: "🌳", bamboo: "🎋", wildflower: "🌼" };
const SCALE_SIZE = { small: 26, medium: 38, large: 54, epic: 74 };
const STAGE_EMOJI = { seed: "🌰", sprout: "🌱", sapling: "🌿", blooming: "🌷", mature: "🌳" };

function TreeNode({ book, onSelect }) {
  const plant = plantTypeForGenre(book.genre);
  const scale = plantScaleFor(book.pages);
  const pos = gridPositionFor(book.id);
  const size = SCALE_SIZE[scale.scale];
  return (
    <button
      onClick={() => onSelect(book)}
      title={book.title}
      className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center hover:scale-110 transition"
      style={{ left: `${8 + pos.x * 84}%`, top: `${15 + pos.y * 70}%` }}
    >
      <span style={{ fontSize: `${size}px`, lineHeight: 1 }}>{PLANT_EMOJI[plant.type]}</span>
      <span className="w-3 h-1.5 rounded-full bg-ink/15 -mt-1" />
    </button>
  );
}

function FlowerbedItem({ book, onSelect }) {
  const progress = readingProgress(book);
  const stage = growthStageFor(progress ? progress.percent : 0);
  return (
    <button
      onClick={() => onSelect(book)}
      className="flex flex-col items-center gap-1.5 bg-card rounded-xl2 shadow-card px-3 py-3 w-24 shrink-0"
    >
      <span className="text-2xl">{STAGE_EMOJI[stage]}</span>
      <span className="text-[0.65rem] text-ink truncate w-full text-center">{book.title}</span>
      {progress && (
        <div className="w-full h-1 rounded-full bg-rose-50 overflow-hidden">
          <div className="h-full bg-sage-500 rounded-full" style={{ width: `${progress.percent}%` }} />
        </div>
      )}
    </button>
  );
}

export default function ForestView({ books, totalRead, totalPages, onSelect }) {
  const level = forestLevelFor(totalPages);
  const next = nextForestLevel(totalPages);
  const remaining = pagesToNextLevel(totalPages);
  const points = estimatedPoints(totalRead, totalPages);
  const doneBooks = books.filter((b) => b.status === "done");
  const readingBooks = books.filter((b) => b.status === "reading");

  const levelProgressPercent = next
    ? Math.min(100, Math.round(((totalPages - level.minPages) / (next.minPages - level.minPages)) * 100))
    : 100;

  return (
    <div>
      <p className="font-serif text-lg text-ink mb-3 flex items-center gap-2">
        <span>🌳</span> 지식의 숲
      </p>

      <div className="rounded-xl2 shadow-card bg-card px-5 py-4 mb-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <p className="font-serif text-xl text-ink">
              {level.level}단계 · {level.name}
            </p>
            <p className="text-xs text-muted mt-0.5">{level.features}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted">보유 포인트</p>
            <p className="font-serif text-lg text-peach-500">{points.toLocaleString("ko-KR")}pt</p>
          </div>
        </div>

        <div className="mt-3">
          <div className="h-2 rounded-full bg-rose-50 overflow-hidden">
            <div
              className="h-full bg-sage-500 rounded-full transition-all"
              style={{ width: `${levelProgressPercent}%` }}
            />
          </div>
          <p className="text-[0.68rem] text-muted mt-1">
            {next
              ? `다음 단계(${next.name})까지 ${remaining.toLocaleString("ko-KR")}쪽`
              : "가장 높은 단계에 도달했어요"}
          </p>
        </div>
      </div>

      <div
        className="relative rounded-xl2 shadow-card overflow-hidden"
        style={{
          minHeight: 320,
          background: "linear-gradient(to bottom, #EAF2EC 0%, #DCE9D8 40%, #C9DCC0 100%)",
        }}
      >
        {doneBooks.length === 0 ? (
          <p className="absolute inset-0 flex items-center justify-center text-center text-muted font-serif px-6">
            책을 다 읽으면 숲에 나무가 심어져요.
          </p>
        ) : (
          doneBooks.map((b) => <TreeNode key={b.id} book={b} onSelect={onSelect} />)
        )}
      </div>

      {readingBooks.length > 0 && (
        <div className="mt-4">
          <p className="text-sm text-muted mb-2">가꾸는 중인 화단</p>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {readingBooks.map((b) => (
              <FlowerbedItem key={b.id} book={b} onSelect={onSelect} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
