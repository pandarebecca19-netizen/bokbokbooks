"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import {
  COLOR_SWATCHES,
  GENRE_SWATCHES,
  STATUS,
  SORT_OPTIONS,
  spineColorFor,
  shelfSpineColorFor,
  spineWidthFor,
  spineWidthForMobile,
  MOBILE_SPINE_H,
  formatDate,
  getFinishYear,
  deriveGenreColors,
  readingProgress,
  matchesSearch,
  sortBooks,
} from "../../lib/constants";
import NoteEditor from "./NoteEditor";
import { noteToHtml } from "../../lib/noteContent";
import BadgeBoard from "./BadgeBoard";
import BadgeCollection from "./BadgeCollection";
import CharacterCard from "./CharacterCard";
import ImportBooks from "./ImportBooks";
import GenreBadges from "./GenreBadges";

const SPINE_H = 190;
const ROW_GAP = 30;
const PATTERN = SPINE_H + ROW_GAP;

export default function ShelfPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [books, setBooks] = useState(null);
  const [tab, setTab] = useState("shelf"); // "shelf" | "stats"
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState("shelf"); // "shelf"(책등) | "cover"(표지) | "list"(리스트)
  const [filterType, setFilterType] = useState(null); // null | "genre" | "year" | "series" | "rating"
  const [filterValue, setFilterValue] = useState(null);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState(null); // null = adding new
  const [detailBook, setDetailBook] = useState(null);
  const [importOpen, setImportOpen] = useState(false);

  const loadBooks = useCallback(async (userId) => {
    const { data, error } = await supabase
      .from("books")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (!error) setBooks(data || []);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const sessionUser = data.session?.user;
      if (!sessionUser) {
        router.replace("/login");
        return;
      }
      setUser(sessionUser);

      const { data: profile } = await supabase
        .from("profiles")
        .select("nickname")
        .eq("id", sessionUser.id)
        .maybeSingle();

      setDisplayName(
        profile?.nickname ||
          sessionUser.user_metadata?.nickname ||
          sessionUser.email.split("@")[0]
      );
      loadBooks(sessionUser.id);
    });
  }, [router, loadBooks]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  const saveBook = async (fields, file, bookId) => {
    let cover_url = fields.cover_url || null;

    if (file) {
      // don't embed the raw file name in the storage path — special
      // characters (한글, 공백, 이모지 등) in a phone's photo filename can
      // make the upload silently fail
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("covers")
        .upload(path, file, { upsert: false });
      if (uploadError) {
        alert(`표지 이미지를 업로드하지 못했어요. 나머지 내용은 저장할게요.\n(${uploadError.message})`);
      } else {
        const { data: pub } = supabase.storage.from("covers").getPublicUrl(path);
        cover_url = pub.publicUrl;
      }
    }

    if (bookId) {
      const { error } = await supabase
        .from("books")
        .update({ ...fields, cover_url })
        .eq("id", bookId);
      if (!error) {
        await loadBooks(user.id);
      } else {
        alert(`저장하지 못했어요.\n(${error.message})`);
        return;
      }
    } else {
      const { error } = await supabase.from("books").insert({
        ...fields,
        cover_url,
        user_id: user.id,
      });
      if (!error) {
        await loadBooks(user.id);
      } else {
        alert(`저장하지 못했어요.\n(${error.message})`);
        return;
      }
    }
    setModalOpen(false);
    setEditingBook(null);
  };

  const deleteBook = async (bookId) => {
    await supabase.from("books").delete().eq("id", bookId);
    await loadBooks(user.id);
    setDetailBook(null);
  };

  const importBooks = async (newBooks) => {
    const payload = newBooks.map((b) => ({ ...b, user_id: user.id }));
    const { error } = await supabase.from("books").insert(payload);
    if (!error) await loadBooks(user.id);
  };

  if (!user || books === null) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <p className="font-serif text-muted">불러오는 중...</p>
      </div>
    );
  }

  const totalRead = books.filter((b) => b.status === "done").length;
  const readingCount = books.filter((b) => b.status === "reading").length;
  const wantCount = books.filter((b) => b.status === "want").length;
  const genreColors = deriveGenreColors(books);

  const doneBooks = books.filter((b) => b.status === "done");
  const totalPages = doneBooks.reduce((sum, b) => sum + (Number(b.pages) || 0), 0);
  const totalPrice = doneBooks.reduce((sum, b) => sum + (Number(b.price) || 0), 0);

  const yearCounts = {};
  const yearPages = {};
  const yearPrice = {};
  books.forEach((b) => {
    if (b.status === "done") {
      const y = getFinishYear(b);
      if (y !== null) {
        yearCounts[y] = (yearCounts[y] || 0) + 1;
        yearPages[y] = (yearPages[y] || 0) + (Number(b.pages) || 0);
        yearPrice[y] = (yearPrice[y] || 0) + (Number(b.price) || 0);
      }
    }
  });
  const years = Object.keys(yearCounts)
    .map(Number)
    .sort((a, b) => b - a);
  const yearlyStats = years.map((y) => ({
    year: y,
    count: yearCounts[y],
    pages: yearPages[y],
    price: yearPrice[y],
  }));

  const genreCounts = {};
  books.forEach((b) => {
    const g = (b.genre || "").trim() || "미분류";
    genreCounts[g] = (genreCounts[g] || 0) + 1;
  });
  const genreList = Object.entries(genreCounts).sort((a, b) => b[1] - a[1]);

  const searchFiltered = books.filter((b) => matchesSearch(b, search));

  // 책장 = 전체 컬렉션(읽는 중 + 다 읽은 책). 읽고 싶어요는 제외.
  const shelfPool = searchFiltered.filter((b) => b.status === "reading" || b.status === "done");

  // 장르/연도/시리즈/별점 필터 선택지 — 가나다순(숫자는 오름차순)으로 정렬
  const genreOptions = [
    ...new Set(shelfPool.map((b) => (b.genre || "").trim() || "미분류")),
  ].sort((a, b) => a.localeCompare(b, "ko"));
  const yearOptions = [
    ...new Set(
      shelfPool
        .filter((b) => b.status === "done")
        .map((b) => getFinishYear(b))
        .filter((y) => y !== null)
    ),
  ].sort((a, b) => a - b);
  const seriesOptions = [
    ...new Set(shelfPool.map((b) => (b.shelf || "").trim()).filter(Boolean)),
  ].sort((a, b) => a.localeCompare(b, "ko"));
  const ratingOptions = [
    ...new Set(shelfPool.map((b) => b.rating || 0).filter((r) => r > 0)),
  ].sort((a, b) => a - b);

  const FILTER_TYPES = [
    { key: "genre", label: "장르", icon: "🏷️", options: genreOptions, display: (v) => v },
    { key: "year", label: "연도", icon: "🗓️", options: yearOptions, display: (v) => `${v}년` },
    { key: "series", label: "시리즈", icon: "📖", options: seriesOptions, display: (v) => v },
    { key: "rating", label: "별점", icon: "⭐", options: ratingOptions, display: (v) => `★${v}` },
  ].sort((a, b) => a.label.localeCompare(b.label, "ko"));

  const activeFilter = FILTER_TYPES.find((f) => f.key === filterType) || null;

  const matchesFilter = (b) => {
    if (!activeFilter || filterValue === null) return true;
    if (filterType === "genre") return ((b.genre || "").trim() || "미분류") === filterValue;
    if (filterType === "year") return b.status === "done" && getFinishYear(b) === Number(filterValue);
    if (filterType === "series") return (b.shelf || "").trim() === filterValue;
    if (filterType === "rating") return (b.rating || 0) === Number(filterValue);
    return true;
  };

  const filteredShelfBooks = shelfPool.filter(matchesFilter);

  const doneCountForFilterGenre =
    filterType === "genre" && filterValue
      ? books.filter((b) => b.status === "done" && ((b.genre || "").trim() || "미분류") === filterValue)
          .length
      : 0;

  // 이미 쓰인 시리즈 이름들 (책 편집 시 자동완성용)
  const seriesNames = [
    ...new Set(books.map((b) => (b.shelf || "").trim()).filter(Boolean)),
  ].sort((a, b) => a.localeCompare(b, "ko"));

  const openAdd = () => {
    setEditingBook(null);
    setModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-cream pb-16">
      <div className="max-w-5xl mx-auto px-5 pt-8">
        <div className="flex justify-end items-center gap-3 mb-1">
          <button
            onClick={() => setImportOpen(true)}
            className="text-xs text-muted hover:text-ink transition"
          >
            📥 가져오기
          </button>
          <button onClick={handleLogout} className="text-xs text-muted hover:text-ink transition">
            로그아웃
          </button>
        </div>

        {/* hero card */}
        <div className="bg-gradient-to-br from-navy to-navy-deep rounded-xl2 shadow-soft px-6 py-7 text-cream relative overflow-hidden">
          <div
            className="absolute -top-16 -right-16 w-56 h-56 rounded-full opacity-[0.15] pointer-events-none"
            style={{ background: "radial-gradient(circle, #E8967A, transparent 70%)" }}
          />
          <p className="text-[0.7rem] tracking-[0.25em] text-peach-300 font-medium relative">MY SHELF</p>
          <h1 className="font-serif text-2xl text-white mt-1.5 relative">안녕하세요, {displayName}님</h1>

          <div className="mt-5 bg-white/[0.06] backdrop-blur-sm border border-white/10 rounded-xl px-5 py-4 relative">
            <p className="font-serif text-4xl text-peach-400 leading-none">
              {totalRead}
              <span className="text-lg text-peach-300 ml-1">권</span>
            </p>
            <p className="text-xs text-white/60 mt-2">
              {STATUS.reading.label} {readingCount}권 · {STATUS.want.label} {wantCount}권
            </p>
            {totalPages > 0 && (
              <p className="text-[0.7rem] text-white/45 mt-1">{totalPages.toLocaleString("ko-KR")}쪽</p>
            )}
          </div>
        </div>

        {/* search */}
        <div className="relative mt-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="제목이나 저자로 검색"
            className="w-full rounded-full border border-rose-100 bg-card px-4 py-2.5 text-sm text-ink placeholder:text-muted focus:border-peach-400 outline-none shadow-card"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink text-sm"
            >
              ✕
            </button>
          )}
        </div>

        {/* tabs + add */}
        <div className="flex items-center gap-2 mt-5">
          <div className="flex-1 flex items-center gap-1 bg-rose-50 rounded-full p-1">
            <button
              onClick={() => setTab("shelf")}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-full py-2.5 text-sm font-medium transition ${
                tab === "shelf" ? "bg-card text-ink shadow-card" : "text-muted hover:text-ink"
              }`}
            >
              <span>📚</span> 책장
            </button>
            <button
              onClick={() => setTab("stats")}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-full py-2.5 text-sm font-medium transition ${
                tab === "stats" ? "bg-card text-ink shadow-card" : "text-muted hover:text-ink"
              }`}
            >
              <span>📊</span> 통계
            </button>
          </div>
          <button
            onClick={openAdd}
            className="shrink-0 bg-peach-500 hover:bg-peach-400 rounded-full shadow-card px-5 py-2.5 flex items-center gap-1.5 text-sm font-medium text-white transition"
          >
            <span>＋</span> 새 책
          </button>
        </div>

        {tab === "shelf" && (
          <div className="mt-5 flex flex-col gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-[0.65rem] uppercase tracking-wider text-muted/80 font-medium">보기</span>
              <div className="flex items-center gap-1 bg-rose-50 rounded-full p-1">
                {[
                  { key: "shelf", label: "📚 책장형" },
                  { key: "cover", label: "🖼️ 표지형" },
                  { key: "list", label: "📋 리스트형" },
                ].map((v) => (
                  <button
                    key={v.key}
                    onClick={() => setViewMode(v.key)}
                    className={`text-xs px-3 py-1.5 rounded-full font-medium transition ${
                      viewMode === v.key ? "bg-card text-ink shadow-card" : "text-muted hover:text-ink"
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-[0.65rem] uppercase tracking-wider text-muted/80 font-medium">필터</span>
              <button
                onClick={() => setFilterPanelOpen((v) => !v)}
                className={`text-xs px-3 py-1.5 rounded-full border transition ${
                  activeFilter && filterValue !== null
                    ? "bg-peach-500 border-peach-500 text-white"
                    : "bg-card border-rose-100 text-muted hover:border-peach-300"
                }`}
              >
                {activeFilter && filterValue !== null
                  ? `${activeFilter.icon} ${activeFilter.label}: ${activeFilter.display(filterValue)}`
                  : "🔍 필터 선택"}
              </button>
              {activeFilter && filterValue !== null && (
                <button
                  onClick={() => {
                    setFilterType(null);
                    setFilterValue(null);
                    setFilterPanelOpen(false);
                  }}
                  className="text-xs text-muted hover:text-ink transition"
                >
                  ✕ 해제
                </button>
              )}
            </div>

            {filterPanelOpen && (
              <div className="bg-card rounded-xl2 shadow-card border border-rose-100 p-3">
                {!activeFilter ? (
                  <div className="flex flex-wrap gap-1.5">
                    {FILTER_TYPES.map((f) => (
                      <button
                        key={f.key}
                        disabled={f.options.length === 0}
                        onClick={() => setFilterType(f.key)}
                        className="text-xs px-3 py-1.5 rounded-full border border-rose-100 text-muted hover:border-peach-300 hover:text-ink disabled:opacity-40 transition"
                      >
                        {f.icon} {f.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div>
                    <button
                      onClick={() => setFilterType(null)}
                      className="text-[0.7rem] text-muted hover:text-ink transition mb-2"
                    >
                      ← 필터 종류 다시 선택
                    </button>
                    <div className="flex flex-wrap gap-1.5">
                      {activeFilter.options.map((opt) => (
                        <button
                          key={opt}
                          onClick={() => {
                            setFilterValue(opt);
                            setFilterPanelOpen(false);
                          }}
                          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition ${
                            filterValue === opt
                              ? "bg-peach-500 border-peach-500 text-white"
                              : "bg-card border-rose-100 text-muted hover:border-peach-300"
                          }`}
                        >
                          {filterType === "genre" && genreColors[opt] && (
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ background: genreColors[opt] }}
                            />
                          )}
                          {activeFilter.display(opt)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-6">
        {tab === "shelf" && (
          <>
            {filterType === "genre" && filterValue && (
              <div className="max-w-5xl mx-auto px-5">
                <GenreBadges key={filterValue} genre={filterValue} count={doneCountForFilterGenre} />
              </div>
            )}
            {viewMode === "list" ? (
              <AllBooksView books={filteredShelfBooks} onSelect={(b) => setDetailBook(b)} />
            ) : (
              <BooksView
                books={sortBooks(filteredShelfBooks, "finish_desc")}
                viewMode={viewMode}
                onSelect={(b) => setDetailBook(b)}
              />
            )}
          </>
        )}

        {tab === "stats" && (
          <StatsView
            books={books}
            doneBooks={doneBooks}
            totalRead={totalRead}
            totalPages={totalPages}
            genreList={genreList}
            genreColors={genreColors}
            yearlyStats={yearlyStats}
          />
        )}
      </div>

      {modalOpen && (
        <BookDetail
          book={editingBook}
          genreColors={genreColors}
          seriesNames={seriesNames}
          onClose={() => {
            setModalOpen(false);
            setEditingBook(null);
          }}
          onSave={(fields, file) => saveBook(fields, file, editingBook?.id)}
        />
      )}

      {detailBook && (
        <BookDetail
          book={detailBook}
          genreColors={genreColors}
          seriesNames={seriesNames}
          onClose={() => setDetailBook(null)}
          onSave={(fields, file) => saveBook(fields, file, detailBook.id)}
          onDelete={() => deleteBook(detailBook.id)}
        />
      )}

      {importOpen && (
        <ImportBooks onImport={importBooks} onClose={() => setImportOpen(false)} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 640 : false
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return isMobile;
}

// picks the bookshelf (spine) view or the cover-grid view for a list
function BooksView({ books, viewMode, onSelect }) {
  return viewMode === "cover" ? (
    <CoverGrid books={books} onSelect={onSelect} />
  ) : (
    <SpineShelf books={books} onSelect={onSelect} />
  );
}

function CoverGrid({ books, onSelect }) {
  if (books.length === 0) {
    return <p className="max-w-5xl mx-auto px-5 text-sm text-muted">아직 책이 없어요.</p>;
  }
  return (
    <div className="max-w-5xl mx-auto px-5">
      <div className="grid grid-cols-3 md:grid-cols-4 gap-3 sm:gap-5">
        {books.map((b) => (
          <CoverCard key={b.id} book={b} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}

function SpineShelf({ books, onSelect }) {
  const isMobile = useIsMobile();
  const spineH = isMobile ? MOBILE_SPINE_H : SPINE_H;
  const pattern = spineH + ROW_GAP;
  return (
    <div className="max-w-5xl mx-auto px-2 sm:px-5">
      <div className="rounded-2xl border-[5px] sm:border-[10px] border-oak bg-white shadow-soft overflow-hidden">
        <div
          className="relative flex flex-wrap content-start items-end px-2 sm:px-6"
          style={{
            minHeight: pattern * 3,
            rowGap: ROW_GAP,
            columnGap: 5,
            backgroundColor: "#FFFFFF",
            backgroundImage: `repeating-linear-gradient(
              to bottom,
              transparent 0px, transparent ${spineH}px,
              rgba(58,46,43,0.10) ${spineH}px, rgba(58,46,43,0.10) ${spineH + 6}px,
              #F1E4C8 ${spineH + 6}px, #FBF6F1 ${spineH + 13}px,
              #E6CDA0 ${spineH + 20}px,
              transparent ${spineH + 20}px, transparent ${pattern}px
            )`,
          }}
        >
          {books.length === 0 && (
            <div className="w-full text-center py-16 text-muted font-serif">
              여기에 꽂힌 책이 아직 없어요.
            </div>
          )}
          {books.map((b) => {
            const color = shelfSpineColorFor(b);
            const width = isMobile ? spineWidthForMobile(b) : spineWidthFor(b);
            // Korean titles read left-to-right across columns; English (no
            // Hangul) titles read right-to-left, like a Western book spine.
            const hasKorean = /[가-힣ㄱ-ㅎㅏ-ㅣ]/.test(b.title || "");
            const writingMode = hasKorean ? "vertical-lr" : "vertical-rl";
            return (
              <button
                key={b.id}
                onClick={() => onSelect(b)}
                title={b.title}
                className="relative flex flex-col items-center rounded-t-sm px-1 py-2.5 transition hover:-translate-y-2 hover:brightness-110"
                style={{
                  width,
                  height: spineH,
                  color: "#3B2A1F",
                  background: `linear-gradient(90deg, ${color.deep} 0%, ${color.base} 10%, ${color.base} 90%, ${color.deep} 100%)`,
                  boxShadow:
                    "inset -4px 0 7px rgba(0,0,0,0.22), inset 3px 0 5px rgba(255,255,255,0.4), inset 0 -16px 12px -12px rgba(0,0,0,0.28), 0 10px 12px rgba(0,0,0,0.3)",
                }}
              >
                <span className="absolute top-0 left-[6%] right-[6%] h-[3px] bg-[rgba(250,245,235,0.55)]" />
                {b.is_favorite && (
                  <span
                    className="absolute top-2 left-1/2 -translate-x-1/2 text-[0.6rem] sm:text-xs"
                    style={{ lineHeight: 1 }}
                  >
                    ❤️
                  </span>
                )}
                <span className="w-[70%] h-[2px] bg-[rgba(59,42,31,0.3)] mb-2 mt-1.5 shrink-0" />
                <span
                  className="flex-1 overflow-hidden font-serif font-bold text-[0.62rem] sm:text-[0.8rem] tracking-wide max-h-full"
                  style={{ writingMode, textOrientation: "mixed", whiteSpace: "normal", wordBreak: "keep-all", overflowWrap: "normal" }}
                >
                  {b.title}
                </span>
                <span className="w-[70%] h-[2px] bg-[rgba(59,42,31,0.3)] mt-2 shrink-0" />
                <span className="absolute bottom-0 left-[6%] right-[6%] h-[3px] bg-[rgba(250,245,235,0.55)]" />
                {b.genre && (
                  <span
                    title={b.genre}
                    className="absolute rounded-full"
                    style={{
                      bottom: 11,
                      width: 13,
                      height: 13,
                      background: b.genre_color,
                      boxShadow:
                        "0 1px 2px rgba(0,0,0,0.25), inset 0 1px 1px rgba(255,255,255,0.35), inset 0 -1px 1px rgba(0,0,0,0.15)",
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
        <div className="h-5 bg-gradient-to-b from-oak-light to-oak shadow-inner" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------
function Stars({ value }) {
  return (
    <div className="flex gap-0.5 text-rose-500 text-sm">
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n}>{n <= (value || 0) ? "★" : "☆"}</span>
      ))}
    </div>
  );
}

function CoverCard({ book, onSelect }) {
  const color = spineColorFor(book);
  return (
    <button
      onClick={() => onSelect(book)}
      className="relative text-left bg-card rounded-xl2 border border-rose-100 shadow-card overflow-hidden hover:-translate-y-1 hover:shadow-soft transition"
    >
      {book.is_favorite && (
        <span
          className="absolute top-1.5 right-1.5 z-10 text-base drop-shadow"
          style={{ lineHeight: 1 }}
        >
          ❤️
        </span>
      )}
      {book.cover_url ? (
        <img
          src={book.cover_url}
          alt={book.title}
          className="w-full aspect-[2/3] object-cover"
          style={{ aspectRatio: "2 / 3" }}
        />
      ) : (
        <div
          className="w-full aspect-[2/3] flex items-center justify-center p-3 text-center"
          style={{ aspectRatio: "2 / 3", background: `linear-gradient(160deg, ${color.base} 0%, ${color.deep} 100%)` }}
        >
          <span className="font-serif font-semibold text-[0.9rem] text-[#3B2A1F] leading-snug">{book.title}</span>
        </div>
      )}
      <div className="p-3">
        <p className="font-serif text-sm text-ink truncate">{book.title}</p>
        {book.author && <p className="text-xs text-muted truncate mt-0.5">{book.author}</p>}
        <div className="mt-1.5">
          <Stars value={book.rating} />
        </div>
      </div>
    </button>
  );
}

// ---------------------------------------------------------------
function ProgressBar({ percent }) {
  return (
    <div className="flex-1 h-1.5 rounded-full bg-rose-50 overflow-hidden">
      <div
        className="h-full bg-peach-500 rounded-full"
        style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
      />
    </div>
  );
}

function AllBooksRow({ book, onSelect }) {
  const color = spineColorFor(book);
  const progress = book.status === "reading" ? readingProgress(book) : null;
  const period = [formatDate(book.start_date), formatDate(book.finish_date)]
    .filter(Boolean)
    .join(" ~ ");

  return (
    <button
      onClick={() => onSelect(book)}
      className="w-full flex gap-4 items-center text-left bg-card rounded-xl2 border border-rose-100 shadow-card px-4 py-3 hover:-translate-y-0.5 hover:shadow-soft transition"
    >
      <div
        className="shrink-0 w-12 rounded-md overflow-hidden flex items-center justify-center"
        style={{ aspectRatio: "2 / 3", background: `linear-gradient(160deg, ${color.base}, ${color.deep})` }}
      >
        {book.cover_url ? (
          <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
        ) : (
          <span className="text-[0.55rem] font-serif font-semibold text-[#3B2A1F] text-center px-1">
            {book.title}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-serif text-sm text-ink truncate flex items-center gap-1.5">
          {book.is_favorite && <span className="shrink-0">❤️</span>}
          {book.title}
        </p>
        {book.author && <p className="text-xs text-muted truncate mt-0.5">{book.author}</p>}

        {book.status === "reading" && (
          <div className="mt-2">
            {progress && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-peach-500 font-medium w-9 shrink-0">{progress.percent}%</span>
                <ProgressBar percent={progress.percent} />
                <span className="text-[0.7rem] text-muted whitespace-nowrap shrink-0">
                  {progress.current} / {progress.total} 페이지
                </span>
              </div>
            )}
            {book.start_date && (
              <p className="text-[0.68rem] text-muted mt-1">{formatDate(book.start_date)} ~</p>
            )}
          </div>
        )}

        {book.status === "done" && (
          <div className="mt-1.5 flex items-center gap-2 flex-wrap">
            <Stars value={book.rating} />
            {period && <span className="text-[0.68rem] text-muted">{period}</span>}
          </div>
        )}

        {book.status === "want" && (
          <p className="text-[0.68rem] text-muted mt-1.5">{STATUS.want.label}</p>
        )}
      </div>
    </button>
  );
}

function AllBooksView({ books, onSelect }) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState("finish_desc");

  const visibleBooks = books;

  const allCount = visibleBooks.length;
  const doneCount = visibleBooks.filter((b) => b.status === "done").length;
  const readingCount = visibleBooks.filter((b) => b.status === "reading").length;
  const favoriteCount = visibleBooks.filter((b) => b.is_favorite).length;

  const filtered =
    statusFilter === "all"
      ? visibleBooks
      : statusFilter === "favorite"
      ? visibleBooks.filter((b) => b.is_favorite)
      : visibleBooks.filter((b) => b.status === statusFilter);
  const sorted = sortBooks(filtered, sortKey);

  return (
    <div className="max-w-5xl mx-auto px-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex gap-1 bg-rose-50 rounded-full p-1">
          {[
            { key: "all", label: `전체 (${allCount})` },
            { key: "done", label: `읽은 책 (${doneCount})` },
            { key: "reading", label: `읽고 있는 책 (${readingCount})` },
            { key: "favorite", label: `❤️ 즐겨찾기 (${favoriteCount})` },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setStatusFilter(t.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                statusFilter === t.key ? "bg-card text-ink shadow-card" : "text-muted hover:text-ink"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value)}
          className="text-xs text-muted bg-card rounded-full px-3 py-1.5 shadow-card border border-rose-100"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.key} value={o.key}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {sorted.length === 0 ? (
        <p className="text-center py-16 font-serif text-muted">해당하는 책이 없어요.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {sorted.map((b) => (
            <AllBooksRow key={b.id} book={b} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------
function StatsView({ books, doneBooks, totalRead, totalPages, genreList, genreColors, yearlyStats }) {
  const won = (n) => `${n.toLocaleString("ko-KR")}원`;
  const pg = (n) => `${n.toLocaleString("ko-KR")}쪽`;

  return (
    <div className="max-w-5xl mx-auto px-5 flex flex-col gap-8">
      <div>
        <CharacterCard books={books} totalPages={totalPages} />
      </div>

      <div>
        <BadgeBoard totalPages={totalPages} />
        <BadgeCollection totalPages={totalPages} doneBooks={doneBooks} genreColors={genreColors} />
      </div>

      <div>
        <p className="font-serif text-lg text-ink mb-3">전체 통계</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card rounded-xl2 border border-rose-100 shadow-card px-4 py-4 text-center">
            <p className="font-serif text-2xl text-ink">{totalRead}</p>
            <p className="text-xs text-muted mt-1">읽은 책</p>
          </div>
          <div className="bg-card rounded-xl2 border border-rose-100 shadow-card px-4 py-4 text-center">
            <p className="font-serif text-2xl text-ink">{totalPages.toLocaleString("ko-KR")}</p>
            <p className="text-xs text-muted mt-1">읽은 쪽수</p>
          </div>
        </div>
      </div>

      <div>
        <p className="font-serif text-lg text-ink mb-3">장르별</p>
        {genreList.length === 0 ? (
          <p className="text-sm text-muted">아직 책이 없어요.</p>
        ) : (
          <div className="bg-card rounded-xl2 border border-rose-100 shadow-card divide-y divide-rose-50">
            {genreList.map(([genre, count]) => (
              <div key={genre} className="flex items-center justify-between px-4 py-3">
                <span className="flex items-center gap-2 text-sm text-ink">
                  {genreColors[genre] && (
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ background: genreColors[genre] }}
                    />
                  )}
                  {genre}
                </span>
                <span className="text-sm text-muted">{count}권</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <p className="font-serif text-lg text-ink mb-3">연도별</p>
        {yearlyStats.length === 0 ? (
          <p className="text-sm text-muted">아직 다 읽은 책이 없어요.</p>
        ) : (
          <div className="bg-card rounded-xl2 border border-rose-100 shadow-card divide-y divide-rose-50">
            {yearlyStats.map((y) => (
              <div key={y.year} className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-ink font-medium">{y.year}년</span>
                <span className="text-xs text-muted text-right">
                  {y.count}권
                  {y.pages > 0 && ` · ${pg(y.pages)}`}
                  {y.price > 0 && ` · ${won(y.price)}`}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// 인쇄용 날짜 표시: 시작일~종료일, 하루만에 다 읽었으면 그 날 하루만
function printDateRange(startDate, finishDate) {
  const s = formatDate(startDate);
  const f = formatDate(finishDate);
  if (s && f) return startDate === finishDate ? f : `${s} ~ ${f}`;
  return s || f || "-";
}

// ---------------------------------------------------------------
function BookDetail({ book, genreColors, seriesNames = [], onClose, onSave, onDelete }) {
  const isEdit = Boolean(book);
  const [title, setTitle] = useState(book?.title || "");
  const [author, setAuthor] = useState(book?.author || "");
  const [pages, setPages] = useState(book?.pages || "");
  const [currentPage, setCurrentPage] = useState(book?.current_page || "");
  const [price, setPrice] = useState(book?.price || "");
  const [series, setSeries] = useState(book?.shelf || "");
  const [status, setStatus] = useState(book?.status || "reading");
  const [colorKey, setColorKey] = useState(book?.color_key || COLOR_SWATCHES[0].key);
  const [genre, setGenre] = useState(book?.genre || "");
  const [genreColor, setGenreColor] = useState(book?.genre_color || GENRE_SWATCHES[0].base);
  const [startDate, setStartDate] = useState(book?.start_date || "");
  const [finishDate, setFinishDate] = useState(book?.finish_date || "");
  const [rating, setRating] = useState(book?.rating || 0);
  const [isFavorite, setIsFavorite] = useState(book?.is_favorite || false);
  const [note, setNote] = useState(book?.note || "");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(book?.cover_url || "");
  const [saving, setSaving] = useState(false);

  const canSubmit = title.trim().length > 0;
  const trimmedGenre = genre.trim();
  const existingGenreColor = trimmedGenre && genreColors[trimmedGenre];
  const effectiveGenreColor = existingGenreColor || genreColor;
  const color = spineColorFor({ title, author, color_key: colorKey });
  const progress = readingProgress({ pages, current_page: currentPage });

  const handleGenreChange = (v) => {
    setGenre(v);
    const match = genreColors[v.trim()];
    if (match) setGenreColor(match);
  };

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    await onSave(
      {
        title: title.trim(),
        author: author.trim(),
        pages: pages ? Number(pages) : null,
        price: price ? Number(price) : null,
        status,
        color_key: colorKey,
        genre: trimmedGenre || null,
        genre_color: trimmedGenre ? effectiveGenreColor : null,
        start_date: startDate || null,
        finish_date: finishDate || null,
        current_page: status === "reading" && currentPage ? Number(currentPage) : null,
        rating,
        is_favorite: isFavorite,
        note,
        shelf: series.trim() || null,
        cover_url: book?.cover_url || null,
      },
      file
    );
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-cream z-50 overflow-y-auto">
      <div className="max-w-5xl mx-auto px-6 pt-6">
        <div className="flex items-center justify-between mb-4">
          <button onClick={onClose} className="text-sm text-muted hover:text-ink transition">
            ← 뒤로
          </button>
          <button
            onClick={() => window.print()}
            className="text-sm text-muted hover:text-ink transition"
          >
            🖨️ 인쇄하기
          </button>
        </div>

        <div className="flex gap-6 flex-wrap items-start">
          <label
            className="shrink-0 w-32 rounded-xl overflow-hidden border border-rose-100 bg-rose-50 flex items-center justify-center cursor-pointer relative shadow-card"
            style={{ aspectRatio: "2 / 3" }}
          >
            {preview ? (
              <img src={preview} alt="표지 미리보기" className="w-full h-full object-cover" style={{ aspectRatio: "2 / 3" }} />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center p-3 text-center"
                style={{ background: `linear-gradient(160deg, ${color.base}, ${color.deep})` }}
              >
                <span className="font-serif font-semibold text-[0.85rem] text-[#3B2A1F]">{title || "표지"}</span>
              </div>
            )}
            <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 text-[0.6rem] bg-black/50 text-white px-2 py-0.5 rounded-full">
              표지 변경
            </span>
            <input type="file" accept="image/*" onChange={handleFile} className="absolute inset-0 opacity-0 cursor-pointer" />
          </label>

          <div className="flex-1 min-w-[280px]">
            <input
              className="font-serif text-xl text-ink w-full border-b border-rose-100 focus:border-peach-400 outline-none pb-1 mb-1 bg-transparent"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="제목"
            />
            <div className="flex gap-2 mb-3">
              <input
                className="text-sm text-muted border-b border-rose-100 focus:border-peach-400 outline-none pb-1 bg-transparent flex-1"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="저자"
              />
              <input
                type="number"
                min="1"
                className="text-sm text-muted border-b border-rose-100 focus:border-peach-400 outline-none pb-1 bg-transparent w-20"
                value={pages}
                onChange={(e) => setPages(e.target.value)}
                placeholder="쪽수"
              />
              <input
                type="number"
                min="0"
                className="text-sm text-muted border-b border-rose-100 focus:border-peach-400 outline-none pb-1 bg-transparent w-24"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="가격(원)"
              />
            </div>

            <div className="flex items-center justify-between mb-3">
              <div className="flex gap-1 text-lg text-rose-500">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" onClick={() => setRating(rating === n ? 0 : n)}>
                    {n <= rating ? "★" : "☆"}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setIsFavorite((v) => !v)}
                title={isFavorite ? "즐겨찾기 해제" : "즐겨찾기에 추가"}
                className="text-2xl leading-none"
              >
                {isFavorite ? "❤️" : "🤍"}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap gap-1.5 items-start content-start">
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

                {status === "reading" && (
                  <div className="flex flex-col gap-1.5">
                    <label className="flex items-center gap-2 text-[0.68rem] text-muted">
                      현재 페이지
                      <input
                        type="number"
                        min="0"
                        className="w-16 rounded-lg border border-rose-100 px-2 py-1 text-xs text-ink"
                        value={currentPage}
                        onChange={(e) => setCurrentPage(e.target.value)}
                      />
                    </label>
                    {progress && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-peach-500 font-medium w-9 shrink-0">
                          {progress.percent}%
                        </span>
                        <ProgressBar percent={progress.percent} />
                        <span className="text-[0.68rem] text-muted whitespace-nowrap shrink-0">
                          {progress.current} / {progress.total}쪽
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <label className="flex flex-col gap-1 text-[0.68rem] text-muted flex-1">
                  읽기 시작
                  <input
                    type="date"
                    className="rounded-lg border border-rose-100 px-2 py-1 text-xs text-ink"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </label>
                <label className="flex flex-col gap-1 text-[0.68rem] text-muted flex-1">
                  다 읽은 날
                  <input
                    type="date"
                    className="rounded-lg border border-rose-100 px-2 py-1 text-xs text-ink"
                    value={finishDate}
                    onChange={(e) => setFinishDate(e.target.value)}
                  />
                </label>
              </div>

              <div>
                <p className="text-[0.68rem] text-muted mb-1">책 색깔</p>
                <div className="flex flex-wrap gap-1.5">
                  {COLOR_SWATCHES.map((s) => (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => setColorKey(s.key)}
                      title={s.label}
                      className={`w-6 h-6 rounded-full transition ${colorKey === s.key ? "ring-2 ring-offset-1 ring-ink" : ""}`}
                      style={{ background: s.base }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[0.68rem] text-muted mb-1">장르</p>
                <input
                  list="genre-name-options"
                  className="rounded-lg border border-rose-100 px-2.5 py-1.5 text-sm text-ink w-full max-w-[200px]"
                  value={genre}
                  onChange={(e) => handleGenreChange(e.target.value)}
                  placeholder="예: 에세이"
                />
                <datalist id="genre-name-options">
                  {Object.keys(genreColors).map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
                {trimmedGenre &&
                  (existingGenreColor ? (
                    <p className="text-[0.68rem] text-muted mt-1.5 flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full" style={{ background: existingGenreColor }} />
                      이미 쓰고 있는 색이에요
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {GENRE_SWATCHES.map((s) => (
                        <button
                          key={s.key}
                          type="button"
                          onClick={() => setGenreColor(s.base)}
                          title={s.label}
                          className={`w-5 h-5 rounded-full transition ${genreColor === s.base ? "ring-2 ring-offset-1 ring-ink" : ""}`}
                          style={{ background: s.base }}
                        />
                      ))}
                    </div>
                  ))}
              </div>

              <div>
                <p className="text-[0.68rem] text-muted mb-1">시리즈 (선택)</p>
                <input
                  list="series-name-options"
                  className="rounded-lg border border-rose-100 px-2.5 py-1.5 text-sm text-ink w-full max-w-[200px]"
                  value={series}
                  onChange={(e) => setSeries(e.target.value)}
                  placeholder="예: 해리 포터"
                />
                <datalist id="series-name-options">
                  {seriesNames.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
                <p className="text-[0.68rem] text-muted mt-1.5">입력하면 시리즈 책장에 모여요.</p>
              </div>

            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 mt-8 pb-16">
        <NoteEditor value={note} onChange={setNote} />
      </div>

      <div className="max-w-5xl mx-auto px-6 pb-16">
        <div className="flex justify-between items-center mt-6">
          <div>
            {isEdit && onDelete && (
              <button onClick={onDelete} className="text-xs text-muted hover:text-rose-600 transition">
                책장에서 빼기
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg border border-rose-100 text-muted text-sm">
              닫기
            </button>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || saving}
              className="px-4 py-2 rounded-lg bg-peach-500 hover:bg-peach-400 disabled:opacity-50 text-white text-sm font-medium"
            >
              {saving ? "저장 중..." : isEdit ? "저장" : "책장에 꽂기"}
            </button>
          </div>
        </div>
      </div>

      {/* 인쇄용 — 화면에는 안 보이고, 인쇄할 때만 이 부분만 출력된다 */}
      <div className="print-area hidden print:block p-10">
        <div className="flex gap-6 items-start">
          {preview && (
            <img
              src={preview}
              alt="표지"
              className="w-36 shrink-0 rounded"
              style={{ aspectRatio: "2 / 3", objectFit: "cover" }}
            />
          )}
          <div>
            <h1 className="font-serif text-2xl font-bold">{title || "제목 없음"}</h1>
            {author && <p className="text-base text-gray-600 mt-1">{author}</p>}
            <div className="mt-1.5">
              <Stars value={rating} />
            </div>
            {pages && <p className="text-sm text-gray-600 mt-3">쪽수: {Number(pages).toLocaleString("ko-KR")}쪽</p>}
            <p className={`text-sm text-gray-600${pages ? "" : " mt-3"}`}>
              읽은 날짜: {printDateRange(startDate, finishDate)}
            </p>
            <p className="text-sm text-gray-600">장르: {trimmedGenre || "-"}</p>
          </div>
        </div>
        <hr className="my-6 border-gray-300" />
        <div
          className="print-note-content"
          dangerouslySetInnerHTML={{ __html: noteToHtml(note) }}
        />
      </div>
    </div>
  );
}
