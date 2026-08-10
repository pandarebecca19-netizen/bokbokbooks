"use client";

import { useState } from "react";
import { STATUS } from "../../lib/constants";

const TITLE_KEYS = ["title", "제목", "책제목", "도서명", "책", "책이름"];
const AUTHOR_KEYS = ["author", "저자", "지은이", "작가"];

function parseSheet(XLSX, arrayBuffer) {
  const wb = XLSX.read(arrayBuffer, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return [];
  const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false });
  if (aoa.length === 0) return [];

  const header = aoa[0].map((c) => String(c ?? "").trim().toLowerCase());
  const titleIdx = header.findIndex((h) => TITLE_KEYS.includes(h));
  const authorIdx = header.findIndex((h) => AUTHOR_KEYS.includes(h));

  let dataRows;
  let tIdx;
  let aIdx;
  if (titleIdx !== -1) {
    dataRows = aoa.slice(1);
    tIdx = titleIdx;
    aIdx = authorIdx; // -1 if there's no author column
  } else {
    // no recognizable header — assume 1st column = title, 2nd = author
    dataRows = aoa;
    tIdx = 0;
    aIdx = 1;
  }

  return dataRows
    .map((r) => ({
      title: String(r[tIdx] ?? "").trim(),
      author: aIdx !== -1 ? String(r[aIdx] ?? "").trim() : "",
    }))
    .filter((b) => b.title);
}

export default function ImportBooks({ onImport, onClose }) {
  const [rows, setRows] = useState(null);
  const [status, setStatus] = useState("want");
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setError("");
    setRows(null);
    setFileName(f.name);
    try {
      const XLSX = await import("xlsx");
      const buf = await f.arrayBuffer();
      const parsed = parseSheet(XLSX, buf);
      if (parsed.length === 0) {
        setError("책을 찾지 못했어요. 첫 번째 열에 제목이 있는지 확인해주세요.");
        return;
      }
      setRows(parsed);
    } catch (err) {
      setError("파일을 읽지 못했어요. .xlsx 또는 .csv 파일인지 확인해주세요.");
    }
  };

  const handleImport = async () => {
    if (!rows || rows.length === 0) return;
    setSaving(true);
    await onImport(rows.map((r) => ({ title: r.title, author: r.author || null, status })));
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 px-6" onClick={onClose}>
      <div
        className="bg-card rounded-xl2 shadow-soft p-6 w-full max-w-md max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="font-serif text-lg text-ink mb-1">스프레드시트로 가져오기</p>
        <p className="text-xs text-muted mb-4">
          엑셀(.xlsx)이나 CSV 파일을 올리면 제목·저자를 읽어 책으로 등록해요. 첫 열을 제목,
          둘째 열을 저자로 인식해요 (헤더에 "제목"/"저자"가 있으면 그 열을 우선 사용).
        </p>

        <label className="block">
          <span className="text-sm text-muted">파일 선택</span>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFile}
            className="mt-1 block w-full text-sm text-ink"
          />
        </label>
        {fileName && <p className="text-xs text-muted mt-1">{fileName}</p>}
        {error && <p className="text-sm text-rose-600 mt-2">{error}</p>}

        {rows && (
          <div className="mt-4">
            <p className="text-sm text-ink mb-2">{rows.length}권을 찾았어요</p>
            <div className="max-h-48 overflow-y-auto border border-rose-100 rounded-lg divide-y divide-rose-50">
              {rows.slice(0, 50).map((r, i) => (
                <div key={i} className="px-3 py-2 text-sm">
                  <span className="text-ink">{r.title}</span>
                  {r.author && <span className="text-muted"> · {r.author}</span>}
                </div>
              ))}
              {rows.length > 50 && (
                <div className="px-3 py-2 text-xs text-muted">… 외 {rows.length - 50}권</div>
              )}
            </div>

            <div className="mt-4">
              <p className="text-[0.68rem] text-muted mb-1.5">가져올 책의 상태</p>
              <div className="flex gap-1.5">
                {Object.entries(STATUS).map(([key, v]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setStatus(key)}
                    className={`px-2.5 py-1 rounded-full text-[0.72rem] border transition ${
                      status === key ? "bg-rose-50 border-rose-400 text-ink" : "border-rose-100 text-muted"
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-rose-100 text-muted text-sm">
            닫기
          </button>
          <button
            onClick={handleImport}
            disabled={!rows || saving}
            className="px-4 py-2 rounded-lg bg-peach-500 hover:bg-peach-400 disabled:opacity-50 text-white text-sm font-medium"
          >
            {saving ? "가져오는 중..." : "가져오기"}
          </button>
        </div>
      </div>
    </div>
  );
}
