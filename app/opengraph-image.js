import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "나의 책장";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const SPINES = [
  { color: "#D9AEA8", h: 250, w: 58 },
  { color: "#E8967A", h: 300, w: 50 },
  { color: "#84AC7C", h: 225, w: 56 },
  { color: "#AE8B60", h: 280, w: 46 },
  { color: "#D98C86", h: 245, w: 60 },
  { color: "#9FBF98", h: 305, w: 50 },
  { color: "#EEAD8E", h: 235, w: 56 },
  { color: "#2C2A30", h: 285, w: 46 },
  { color: "#E3B36B", h: 255, w: 58 },
  { color: "#C97B77", h: 230, w: 50 },
];

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#FBF6F1",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-end", gap: 10 }}>
          {SPINES.map((s, i) => (
            <div
              key={i}
              style={{
                width: s.w,
                height: s.h,
                background: s.color,
                borderRadius: "6px 6px 0 0",
                boxShadow: "0 8px 14px rgba(58,46,43,0.18)",
              }}
            />
          ))}
        </div>
        <div
          style={{
            width: 640,
            height: 16,
            background: "#E6CDA0",
            borderRadius: 4,
            marginTop: -4,
            boxShadow: "0 6px 10px rgba(58,46,43,0.12)",
          }}
        />
        <div
          style={{
            display: "flex",
            fontSize: 68,
            color: "#3A2E2B",
            fontWeight: 700,
            marginTop: 40,
          }}
        >
          나의 책장
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 28,
            color: "#8B7873",
            marginTop: 14,
          }}
        >
          읽은 책을 기록하고 정리하는 나만의 책장
        </div>
      </div>
    ),
    { ...size }
  );
}
