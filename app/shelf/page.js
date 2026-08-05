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
  formatDate,
  getFinishYear,
  deriveGenreColors,
  readingProgress,
  matchesSearch,
  sortBooks,
} from "../../lib/constants";
import NoteEditor from "./NoteEditor";
import BadgeBoard from "./BadgeBoard";
import GenreBadges from "./GenreBadges";

const SPINE_H = 190;
const ROW_GAP = 30;
const PATTERN = SPINE_H + ROW_GAP;

export default function ShelfPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [books, setBooks] = useState(null);
  const [tab, setTab] = useState("shelf"); // "shelf" | "list" | "years" | "genres" | "stats"
  const [selectedYear, setSelectedYear] = useState(null);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState(null); // null = adding new
  const [detailBook, setDetailBook] = useState(null);

  const loadBooks = useCallback(async (userId) => {
    const { data, error } = await supabase
      .from("books")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (!error) setBooks(data || []);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        router.replace("/login");
        return;
      }
      setUser(data.user);

      const { data: profile } = await supabase
        .from("profiles")
        .select("nickname")
        .eq("id", data.user.id)
        .maybeSingle();

      setDisplayName(
        profile?.nickname ||
          data.user.user_metadata?.nickname ||
          data.user.email.split("@")[0]
      );
      loadBooks(data.user.id);
    });
  }, [router, loadBooks]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  const saveBook = async (fields, file, bookId) => {
    let cover_url = fields.cover_url || null;

    if (file) {
      const path = `${user.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("covers")
        .upload(path, file, { upsert: false });
      if (!uploadError) {
        const { data: pub } = supabase.storage.from("covers").getPublicUrl(path);
        cover_url = pub.publicUrl;
      }
    }

    if (bookId) {
      const { error } = await supabase
        .from("books")
        .update({ ...fields, cover_url })
        .eq("id", bookId);
      if (!error) await loadBooks(user.id);
    } else {
      const { error } = await supabase.from("books").insert({
        ...fields,
        cover_url,
        user_id: user.id,
      });
      if (!error) await loadBooks(user.id);
    }
    setModalOpen(false);
    setEditingBook(null);
  };

  const deleteBook = async (bookId) => {
    await supabase.from("books").delete().eq("id", bookId);
    await loadBooks(user.id);
    setDetailBook(null);
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

  const shelfBooks = sortBooks(
    selectedYear
      ? searchFiltered.filter((b) => b.status === "done" && getFinishYear(b) === selectedYear)
      : searchFiltered,
    "finish_desc"
  );

  const openAdd = () => {
    setEditingBook(null);
    setModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-cream pb-16">
      <div className="max-w-5xl mx-auto px-5 pt-8">
        <div className="flex justify-end mb-1">
          <button onClick={handleLogout} className="text-xs text-muted hover:text-ink transition">
            로그아웃
          </button>
        </div>

        {/* hero card */}
        <div className="bg-navy rounded-xl2 shadow-soft px-6 py-6 text-cream relative overflow-hidden">
          <div
            className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-20"
            style={{ background: "radial-gradient(circle, #E8967A, transparent 70%)" }}
          />
          <p className="text-[0.7rem] tracking-[0.2em] text-peach-300 font-medium relative">MY SHELF</p>
          <h1 className="font-serif text-2xl text-white mt-1 relative">안녕하세요, {displayName}님</h1>

          <div className="mt-4 bg-navy-deep rounded-xl px-5 py-4 relative">
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
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mt-4">
          <button
            onClick={() => setTab("shelf")}
            className={`bg-card rounded-xl2 shadow-card px-3 py-4 flex flex-col items-center gap-1.5 transition hover:-translate-y-0.5 ${
              tab === "shelf" ? "ring-2 ring-peach-400" : ""
            }`}
          >
            <span className="text-xl">📚</span>
            <span className="text-xs text-ink font-medium">책장</span>
          </button>
          <button
            onClick={() => setTab("list")}
            className={`bg-card rounded-xl2 shadow-card px-3 py-4 flex flex-col items-center gap-1.5 transition hover:-translate-y-0.5 ${
              tab === "list" ? "ring-2 ring-peach-400" : ""
            }`}
          >
            <span className="text-xl">📋</span>
            <span className="text-xs text-ink font-medium">전체보기</span>
          </button>
          <button
            onClick={() => setTab("years")}
            className={`bg-card rounded-xl2 shadow-card px-3 py-4 flex flex-col items-center gap-1.5 transition hover:-translate-y-0.5 ${
              tab === "years" ? "ring-2 ring-peach-400" : ""
            }`}
          >
            <span className="text-xl">🗓️</span>
            <span className="text-xs text-ink font-medium">연도별</span>
          </button>
          <button
            onClick={() => setTab("genres")}
            className={`bg-card rounded-xl2 shadow-card px-3 py-4 flex flex-col items-center gap-1.5 transition hover:-translate-y-0.5 ${
              tab === "genres" ? "ring-2 ring-peach-400" : ""
            }`}
          >
            <span className="text-xl">🏷️</span>
            <span className="text-xs text-ink font-medium">장르별</span>
          </button>
          <button
            onClick={() => setTab("stats")}
            className={`bg-card rounded-xl2 shadow-card px-3 py-4 flex flex-col items-center gap-1.5 transition hover:-translate-y-0.5 ${
              tab === "stats" ? "ring-2 ring-peach-400" : ""
            }`}
          >
            <span className="text-xl">📊</span>
            <span className="text-xs text-ink font-medium">통계</span>
          </button>
          <button
            onClick={openAdd}
            className="bg-peach-500 rounded-xl2 shadow-card px-3 py-4 flex flex-col items-center gap-1.5 transition hover:-translate-y-0.5 hover:bg-peach-400"
          >
            <span className="text-xl">＋</span>
            <span className="text-xs text-white font-medium">새 책</span>
          </button>
        </div>

        {tab === "shelf" && years.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            <button
              onClick={() => setSelectedYear(null)}
              className={`text-xs px-3 py-1.5 rounded-full border transition ${
                selectedYear === null
                  ? "bg-navy border-navy text-white"
                  : "bg-card border-rose-100 text-muted hover:border-peach-300"
              }`}
            >
              전체
            </button>
            {years.map((y) => (
              <button
                key={y}
                onClick={() => setSelectedYear(selectedYear === y ? null : y)}
                className={`text-xs px-3 py-1.5 rounded-full border transition ${
                  selectedYear === y
                    ? "bg-navy border-navy text-white"
                    : "bg-card border-rose-100 text-muted hover:border-peach-300"
                }`}
              >
                {y}년 · {yearCounts[y]}권
              </button>
            ))}
          </div>
        )}

        {tab === "shelf" && Object.keys(genreColors).length > 0 && (
          <div className="flex flex-wrap gap-3 mt-4">
            {Object.entries(genreColors).map(([genre, color]) => (
              <div key={genre} className="flex items-center gap-1.5 text-[0.7rem] text-muted">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ background: color, boxShadow: "0 1px 2px rgba(0,0,0,0.2)" }}
                />
                {genre}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6">
        {tab === "shelf" && (
          <ShelfView
            books={shelfBooks}
            allEmpty={books.length === 0}
            selectedYear={selectedYear}
            onSelect={(b) => setDetailBook(b)}
          />
        )}

        {tab === "list" && (
          <AllBooksView books={searchFiltered} onSelect={(b) => setDetailBook(b)} />
        )}

        {tab === "years" && (
          <YearsView books={searchFiltered} years={years} onSelect={(b) => setDetailBook(b)} />
        )}

        {tab === "genres" && (
          <GenresView books={searchFiltered} genreColors={genreColors} onSelect={(b) => setDetailBook(b)} />
        )}

        {tab === "stats" && (
          <StatsView
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
          onClose={() => setDetailBook(null)}
          onSave={(fields, file) => saveBook(fields, file, detailBook.id)}
          onDelete={() => deleteBook(detailBook.id)}
        />
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

function ShelfView({ books, allEmpty, selectedYear, onSelect }) {
  const isMobile = useIsMobile();
  return (
    <div className="max-w-5xl mx-auto px-2 sm:px-5">
      <div className="rounded-2xl border-[5px] sm:border-[10px] border-[#E5E1DA] bg-white shadow-soft overflow-hidden">
        <div
          className="relative flex flex-wrap content-start items-end px-2 sm:px-6"
          style={{
            minHeight: PATTERN * 3,
            rowGap: ROW_GAP,
            columnGap: 5,
            backgroundColor: "#FFFFFF",
            backgroundImage: `repeating-linear-gradient(
              to bottom,
              transparent 0px, transparent ${SPINE_H}px,
              rgba(0,0,0,0.08) ${SPINE_H}px, rgba(0,0,0,0.08) ${SPINE_H + 6}px,
              #EDEBE7 ${SPINE_H + 6}px, #F7F6F4 ${SPINE_H + 13}px,
              #E3E0DA ${SPINE_H + 20}px,
              transparent ${SPINE_H + 20}px, transparent ${PATTERN}px
            )`,
          }}
        >
          {allEmpty && (
            <div className="w-full text-center py-16 text-muted font-serif">
              아직 책장이 비어있어요.
              <br />
              읽은 책을 기록해서 채워보세요.
            </div>
          )}
          {!allEmpty && books.length === 0 && (
            <div className="w-full text-center py-16 text-muted font-serif">
              {selectedYear}년에 다 읽은 책이 아직 없어요.
            </div>
          )}
          {books.map((b) => {
            const color = shelfSpineColorFor(b);
            const width = isMobile ? spineWidthForMobile(b) : spineWidthFor(b);
            return (
              <button
                key={b.id}
                onClick={() => onSelect(b)}
                title={b.title}
                className="relative flex flex-col items-center rounded-t-sm px-1 py-2.5 transition hover:-translate-y-2 hover:brightness-110"
                style={{
                  width,
                  height: SPINE_H,
                  color: "#3B2A1F",
                  background: `linear-gradient(90deg, ${color.deep} 0%, ${color.base} 10%, ${color.base} 90%, ${color.deep} 100%)`,
                  boxShadow:
                    "inset -4px 0 7px rgba(0,0,0,0.22), inset 3px 0 5px rgba(255,255,255,0.4), inset 0 -16px 12px -12px rgba(0,0,0,0.28), 0 10px 12px rgba(0,0,0,0.3)",
                }}
              >
                <span className="absolute top-0 left-[6%] right-[6%] h-[3px] bg-[rgba(250,245,235,0.55)]" />
                <span className="w-[70%] h-[2px] bg-[rgba(59,42,31,0.3)] mb-2 mt-1.5 shrink-0" />
                <span
                  className="flex-1 overflow-hidden font-serif font-bold text-[0.62rem] sm:text-[0.8rem] tracking-wide max-h-full"
                  style={{ writingMode: "vertical-lr", textOrientation: "mixed", whiteSpace: "normal", wordBreak: "keep-all", overflowWrap: "normal" }}
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
        <div className="h-5 bg-gradient-to-b from-[#EDEBE7] to-[#E0DDD6] shadow-inner" />
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
      className="text-left bg-card rounded-xl2 shadow-card overflow-hidden hover:-translate-y-1 transition"
    >
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
      className="w-full flex gap-4 items-center text-left bg-card rounded-xl2 shadow-card px-4 py-3 hover:-translate-y-0.5 transition"
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
        <p className="font-serif text-sm text-ink truncate">{book.title}</p>
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

  const allCount = books.length;
  const doneCount = books.filter((b) => b.status === "done").length;
  const readingCount = books.filter((b) => b.status === "reading").length;

  const filtered =
    statusFilter === "all" ? books : books.filter((b) => b.status === statusFilter);
  const sorted = sortBooks(filtered, sortKey);

  return (
    <div className="max-w-5xl mx-auto px-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex gap-1 bg-card rounded-full p-1 shadow-card">
          {[
            { key: "all", label: `전체 (${allCount})` },
            { key: "done", label: `읽은 책 (${doneCount})` },
            { key: "reading", label: `읽고 있는 책 (${readingCount})` },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setStatusFilter(t.key)}
              className={`px-3 py-1.5 rounded-full text-xs transition ${
                statusFilter === t.key ? "bg-navy text-white" : "text-muted"
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
function YearsView({ books, years, onSelect }) {
  const [selectedYear, setSelectedYear] = useState(years[0] || null);

  if (years.length === 0) {
    return <p className="text-center py-16 font-serif text-muted">아직 다 읽은 책이 없어요.</p>;
  }

  const yearBooks = books.filter((b) => b.status === "done" && getFinishYear(b) === selectedYear);

  return (
    <div className="max-w-5xl mx-auto px-5">
      <div className="flex flex-wrap gap-2 mb-6">
        {years.map((year) => (
          <button
            key={year}
            onClick={() => setSelectedYear(year)}
            className={`text-sm px-4 py-2 rounded-full border transition ${
              selectedYear === year
                ? "bg-navy border-navy text-white"
                : "bg-card border-rose-100 text-muted hover:border-peach-300"
            }`}
          >
            {year}년
          </button>
        ))}
      </div>

      <p className="font-serif text-lg text-ink mb-3">
        {selectedYear}년 <span className="text-sm text-muted">· {yearBooks.length}권</span>
      </p>
      {yearBooks.length === 0 ? (
        <p className="text-sm text-muted">이 해에 다 읽은 책이 없어요.</p>
      ) : (
        <div className="grid grid-cols-3 md:grid-cols-4 gap-3 sm:gap-5">
          {yearBooks.map((b) => (
            <CoverCard key={b.id} book={b} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------
function GenresView({ books, genreColors, onSelect }) {
  const groups = {};
  books.forEach((b) => {
    const g = (b.genre || "").trim() || "미분류";
    if (!groups[g]) groups[g] = [];
    groups[g].push(b);
  });
  const genreNames = Object.keys(groups).sort((a, b) => groups[b].length - groups[a].length);

  const [selectedGenre, setSelectedGenre] = useState(genreNames[0] || null);

  if (genreNames.length === 0) {
    return <p className="text-center py-16 font-serif text-muted">아직 책이 없어요.</p>;
  }

  const genreBooks = groups[selectedGenre] || [];
  const doneCountForGenre = genreBooks.filter((b) => b.status === "done").length;

  return (
    <div className="max-w-5xl mx-auto px-5">
      <div className="flex flex-wrap gap-2 mb-6">
        {genreNames.map((genre) => (
          <button
            key={genre}
            onClick={() => setSelectedGenre(genre)}
            className={`flex items-center gap-1.5 text-sm px-4 py-2 rounded-full border transition ${
              selectedGenre === genre
                ? "bg-navy border-navy text-white"
                : "bg-card border-rose-100 text-muted hover:border-peach-300"
            }`}
          >
            {genreColors[genre] && (
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ background: genreColors[genre] }}
              />
            )}
            {genre}
          </button>
        ))}
      </div>

      <GenreBadges key={selectedGenre} genre={selectedGenre} count={doneCountForGenre} />

      <p className="font-serif text-lg text-ink mb-3 flex items-center gap-2">
        {genreColors[selectedGenre] && (
          <span
            className="w-3 h-3 rounded-full"
            style={{ background: genreColors[selectedGenre], boxShadow: "0 1px 2px rgba(0,0,0,0.2)" }}
          />
        )}
        {selectedGenre} <span className="text-sm text-muted">· {genreBooks.length}권</span>
      </p>
      <div className="grid grid-cols-3 md:grid-cols-4 gap-3 sm:gap-5">
        {genreBooks.map((b) => (
          <CoverCard key={b.id} book={b} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------
function StatsView({ totalRead, totalPages, genreList, genreColors, yearlyStats }) {
  const won = (n) => `${n.toLocaleString("ko-KR")}원`;
  const pg = (n) => `${n.toLocaleString("ko-KR")}쪽`;

  return (
    <div className="max-w-5xl mx-auto px-5 flex flex-col gap-8">
      <div>
        <BadgeBoard totalPages={totalPages} />
      </div>

      <div>
        <p className="font-serif text-lg text-ink mb-3">전체 통계</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card rounded-xl2 shadow-card px-4 py-4 text-center">
            <p className="font-serif text-2xl text-ink">{totalRead}</p>
            <p className="text-xs text-muted mt-1">읽은 책</p>
          </div>
          <div className="bg-card rounded-xl2 shadow-card px-4 py-4 text-center">
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
          <div className="bg-card rounded-xl2 shadow-card divide-y divide-rose-50">
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
          <div className="bg-card rounded-xl2 shadow-card divide-y divide-rose-50">
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

// ---------------------------------------------------------------
function BookDetail({ book, genreColors, onClose, onSave, onDelete }) {
  const isEdit = Boolean(book);
  const [title, setTitle] = useState(book?.title || "");
  const [author, setAuthor] = useState(book?.author || "");
  const [pages, setPages] = useState(book?.pages || "");
  const [currentPage, setCurrentPage] = useState(book?.current_page || "");
  const [price, setPrice] = useState(book?.price || "");
  const [status, setStatus] = useState(book?.status || "reading");
  const [colorKey, setColorKey] = useState(book?.color_key || COLOR_SWATCHES[0].key);
  const [genre, setGenre] = useState(book?.genre || "");
  const [genreColor, setGenreColor] = useState(book?.genre_color || GENRE_SWATCHES[0].base);
  const [startDate, setStartDate] = useState(book?.start_date || "");
  const [finishDate, setFinishDate] = useState(book?.finish_date || "");
  const [rating, setRating] = useState(book?.rating || 0);
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
        note,
        cover_url: book?.cover_url || null,
      },
      file
    );
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-cream z-50 overflow-y-auto">
      <div className="max-w-5xl mx-auto px-6 pt-6">
        <button onClick={onClose} className="text-sm text-muted hover:text-ink transition mb-4">
          ← 뒤로
        </button>

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

            <div className="flex gap-1 text-lg text-rose-500 mb-3">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => setRating(rating === n ? 0 : n)}>
                  {n <= rating ? "★" : "☆"}
                </button>
              ))}
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
                  className="rounded-lg border border-rose-100 px-2.5 py-1.5 text-sm text-ink w-full max-w-[200px]"
                  value={genre}
                  onChange={(e) => handleGenreChange(e.target.value)}
                  placeholder="예: 에세이"
                />
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
    </div>
  );
}
