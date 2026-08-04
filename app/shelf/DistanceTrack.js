"use client";

import { useEffect, useState } from "react";
import {
  CLIMB_LANDMARKS,
  DIVE_LANDMARKS,
  checkpointIndex,
  formatKm,
  nextCheckpointKm,
  readingDistanceKm,
  trackPosition,
} from "../../lib/constants";

const TRACK_HEIGHT = 260;

const CLIMB_GRADIENT =
  "linear-gradient(to top, #AE8B60 0%, #CBAA7C 8%, #9FBF98 22%, #9BB0C1 46%, #8E97B5 66%, #2C2A30 86%, #1F1D22 100%)";
const DIVE_GRADIENT =
  "linear-gradient(to bottom, #CFE1E8 0%, #9BB0C1 22%, #8E97B5 46%, #55597A 66%, #2C2A30 86%, #16151C 100%)";

const STARS = [
  { x: 12, y: 6 }, { x: 30, y: 3 }, { x: 52, y: 8 }, { x: 70, y: 4 },
  { x: 85, y: 10 }, { x: 20, y: 14 }, { x: 62, y: 15 }, { x: 92, y: 5 },
];
const BUBBLES = [
  { x: 18, size: 5 }, { x: 40, size: 3 }, { x: 58, size: 6 },
  { x: 74, size: 4 }, { x: 88, size: 3 },
];

function BookCharacter() {
  return (
    <svg width="34" height="34" viewBox="0 0 40 40" className="drop-shadow-md book-bob">
      <line x1="15" y1="30" x2="12" y2="38" stroke="#3A2E2B" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="23" y1="30" x2="26" y2="38" stroke="#3A2E2B" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="10" y1="18" x2="4" y2="9" stroke="#3A2E2B" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="28" y1="18" x2="34" y2="9" stroke="#3A2E2B" strokeWidth="2.5" strokeLinecap="round" />
      <rect x="9" y="8" width="20" height="24" rx="3" fill="#EEAD8E" stroke="#3A2E2B" strokeWidth="1.5" />
      <line x1="19" y1="8" x2="19" y2="32" stroke="#3A2E2B" strokeWidth="1" opacity="0.35" />
      <circle cx="15" cy="18" r="1.6" fill="#3A2E2B" />
      <circle cx="23" cy="18" r="1.6" fill="#3A2E2B" />
      <path d="M14 23 Q19 27 24 23" stroke="#3A2E2B" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function Mountains() {
  return (
    <svg
      className="absolute bottom-0 left-0 w-full"
      height="70"
      viewBox="0 0 300 70"
      preserveAspectRatio="none"
    >
      <polygon points="0,70 60,15 130,70" fill="#8C6F49" opacity="0.9" />
      <polygon points="90,70 170,5 240,70" fill="#AE8B60" opacity="0.9" />
      <polygon points="190,70 250,25 300,70" fill="#9C8158" opacity="0.85" />
    </svg>
  );
}

function FishAndBubbles() {
  return (
    <>
      <svg className="absolute" style={{ top: "34%", left: "14%" }} width="26" height="14" viewBox="0 0 26 14">
        <ellipse cx="14" cy="7" rx="10" ry="5" fill="#EFC0B8" opacity="0.55" />
        <polygon points="4,7 -4,2 -4,12" fill="#EFC0B8" opacity="0.55" />
      </svg>
      {BUBBLES.map((b, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-white/40 bubble-rise"
          style={{
            left: `${b.x}%`,
            width: b.size,
            height: b.size,
            bottom: 6,
            animationDelay: `${i * 0.9}s`,
          }}
        />
      ))}
    </>
  );
}

export default function DistanceTrack({ mode, setMode, totalPages }) {
  const [revealed, setRevealed] = useState(false);
  const distanceKm = readingDistanceKm(totalPages);
  const landmarks = mode === "dive" ? DIVE_LANDMARKS : CLIMB_LANDMARKS;
  const { passed, next, beyondAll, percent } = trackPosition(distanceKm, landmarks);
  const nextCp = nextCheckpointKm(distanceKm);

  useEffect(() => {
    setRevealed(false);
    const t = setTimeout(() => setRevealed(true), 150);
    return () => clearTimeout(t);
  }, [mode, distanceKm]);

  const shownPercent = revealed ? percent : 0;
  const isDive = mode === "dive";

  // checkpoint tick marks between the last landmark and the next one
  const startIdx = checkpointIndex(passed ? passed.km : 0);
  const endIdx = next ? Math.max(startIdx + 1, checkpointIndex(next.km)) : startIdx + 1;
  const ticks = [];
  for (let i = startIdx + 1; i < endIdx; i++) {
    ticks.push(((i - startIdx) / (endIdx - startIdx)) * 100);
  }

  return (
    <div>
      <style>{`
        @keyframes book-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
        .book-bob { animation: book-bob 2.2s ease-in-out infinite; }
        @keyframes bubble-rise {
          0% { transform: translateY(0); opacity: 0.7; }
          100% { transform: translateY(-160px); opacity: 0; }
        }
        .bubble-rise { animation: bubble-rise 4.5s linear infinite; }
      `}</style>

      <div className="flex items-center justify-between mb-3">
        <p className="font-serif text-lg text-ink">독서 거리</p>
        <div className="flex gap-1 bg-card rounded-full p-1 shadow-card">
          <button
            onClick={() => setMode("climb")}
            className={`px-3 py-1.5 rounded-full text-xs transition ${
              !isDive ? "bg-navy text-white" : "text-muted"
            }`}
          >
            🏔️ 위로 오르기
          </button>
          <button
            onClick={() => setMode("dive")}
            className={`px-3 py-1.5 rounded-full text-xs transition ${
              isDive ? "bg-navy text-white" : "text-muted"
            }`}
          >
            🌊 아래로 내려가기
          </button>
        </div>
      </div>

      <div className="rounded-xl2 shadow-card overflow-hidden grid grid-cols-1 sm:grid-cols-[1fr_220px]">
        <div
          className="relative overflow-hidden"
          style={{ height: TRACK_HEIGHT, background: isDive ? DIVE_GRADIENT : CLIMB_GRADIENT }}
        >
          {!isDive && (
            <>
              {STARS.map((s, i) => (
                <span
                  key={i}
                  className="absolute rounded-full bg-white"
                  style={{ left: `${s.x}%`, top: `${s.y}%`, width: 2, height: 2, opacity: 0.75 }}
                />
              ))}
              <Mountains />
            </>
          )}
          {isDive && <FishAndBubbles />}

          {ticks.map((t, i) => (
            <div
              key={i}
              className="absolute left-1/2 -translate-x-1/2 w-10 h-px bg-white/30"
              style={isDive ? { top: `${t}%` } : { bottom: `${t}%` }}
            />
          ))}

          <div
            className="absolute left-1/2 -translate-x-1/2 transition-all duration-[1200ms] ease-out"
            style={isDive ? { top: `${shownPercent}%` } : { bottom: `${shownPercent}%` }}
          >
            <BookCharacter />
          </div>
        </div>

        <div className="bg-card px-4 py-4 flex flex-col justify-center gap-3">
          <div>
            <p className="text-[0.68rem] text-muted">현재 거리</p>
            <p className="font-serif text-2xl text-ink">{formatKm(distanceKm)}km</p>
          </div>

          <div>
            <p className="text-[0.68rem] text-muted">방금 통과한 지점</p>
            <p className="text-sm text-ink">
              {passed ? (
                <>
                  {passed.label}
                  {passed.note && <span className="text-muted"> · {passed.note}</span>}
                </>
              ) : (
                <span className="text-muted">아직 첫 지점 전이에요</span>
              )}
            </p>
          </div>

          {beyondAll ? (
            <div>
              <p className="text-[0.68rem] text-muted">
                {isDive ? "지금까지 내려간 깊이" : "지금까지 온 고도"}
              </p>
              <p className="text-sm text-ink">{formatKm(distanceKm)}km · 계속 나아가는 중</p>
            </div>
          ) : (
            <div>
              <p className="text-[0.68rem] text-muted">다음 목표</p>
              <p className="text-sm text-ink">
                {next.label}까지 {formatKm(next.km - distanceKm)}km
              </p>
            </div>
          )}

          <div>
            <p className="text-[0.68rem] text-muted">다음 체크포인트까지</p>
            <p className="text-sm text-ink">{formatKm(Math.max(0, nextCp - distanceKm))}km</p>
          </div>
        </div>
      </div>
    </div>
  );
}
