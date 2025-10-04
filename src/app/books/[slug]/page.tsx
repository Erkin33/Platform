"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  getBookBySlugOrId,
  type BookItem,
  setUserBookProgress,
  getUserBookProgress,
  getUserBookRating,
  setUserBookRating,
  BOOKS_CHANGED,
  BOOK_PROGRESS_CHANGED,
  BOOK_RATING_CHANGED,
  getPdfBlob,
} from "@/lib/books";
import { getUser } from "@/lib/user";
import { Star, FileText, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";

/**
 * ВАЖНО:
 * - Для PDF мы НЕ можем надёжно читать текущую страницу из встроенного PDF viewer браузера.
 * - Поэтому добавлен лёгкий контрол (Prev/Next/Перейти на страницу). Каждый переход меняет page state
 *   и мгновенно сохраняет прогресс в процентах (page/total * 100) через setUserBookProgress.
 * - При открытии PDF стартовая страница берётся из сохранённого прогресса.
 */

export default function BookReaderPage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = use(props.params);

  const textRef = useRef<HTMLDivElement>(null);

  const [book, setBook] = useState<BookItem | null>(null);
  const [uid, setUid] = useState("current");
  const [progress, setProgress] = useState(0);
  const [myRating, setMyRating] = useState(0);

  // --- PDF state ---
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1); // 1..book.pages
  const [pageInput, setPageInput] = useState<string>("1");

  const totalPages = Math.max(1, book?.pages || 1);

  const loadAll = useCallback(() => {
    const u = getUser();
    const id = u.name || "current";
    setUid(id);

    const b = getBookBySlugOrId(slug) || null;
    setBook(b);
    if (b) {
      const p = getUserBookProgress(b, id);
      setProgress(p);
      setMyRating(getUserBookRating(b, id));

      if (b.format === "pdf") {
        // начальная страница для PDF — из процента прогресса
        const startPage =
          Math.min(Math.max(1, Math.round((Math.max(0, Math.min(100, p)) / 100) * Math.max(1, b.pages || 1))), Math.max(1, b.pages || 1)) ||
          1;
        setCurrentPage(startPage);
        setPageInput(String(startPage));
      }
    } else {
      setProgress(0);
      setMyRating(0);
      setCurrentPage(1);
      setPageInput("1");
    }
  }, [slug]);

  useEffect(() => {
    loadAll();
    const on = () => loadAll();
    window.addEventListener(BOOKS_CHANGED, on);
    window.addEventListener(BOOK_PROGRESS_CHANGED, on);
    window.addEventListener(BOOK_RATING_CHANGED, on);
    window.addEventListener("storage", on);
    return () => {
      window.removeEventListener(BOOKS_CHANGED, on);
      window.removeEventListener(BOOK_PROGRESS_CHANGED, on);
      window.removeEventListener(BOOK_RATING_CHANGED, on);
      window.removeEventListener("storage", on);
    };
  }, [loadAll]);

  // ---------- PDF: формирование objectURL под конкретную страницу ----------
  async function buildPdfUrl(b: BookItem, page: number) {
    setPdfError(null);
    setPdfUrl(null);
    const blob = await getPdfBlob(b.id);
    if (!blob) {
      setPdfError("PDF topilmadi (IndexedDB tozalangan bo‘lishi mumkin). Admin orqali qayta yuklab qo‘ying.");
      return;
    }
    const base = URL.createObjectURL(blob);
    setPdfUrl(`${base}#page=${page}&view=FitH`);
  }

  // При изменении книги/страницы — перерисовываем iframe
  useEffect(() => {
    if (!book || book.format !== "pdf") {
      // если это не PDF — скидываем URL
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
      setPdfError(null);
      return;
    }
    buildPdfUrl(book, currentPage);
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book, currentPage]);

  // ---------- TEXT: автосейв по скроллу ----------
  useEffect(() => {
    if (!book || book.format !== "text") return;
    const b = book as BookItem;
    const el = textRef.current;
    if (!el) return;

    // восстановим позицию
    const restore = () => {
      const max = el.scrollHeight - el.clientHeight;
      if (max > 0) el.scrollTop = Math.round((progress / 100) * max);
    };
    const t = setTimeout(restore, 0);

    const onScroll = () => {
      const max = el.scrollHeight - el.clientHeight;
      const p = max > 0 ? Math.min(100, Math.round((el.scrollTop / max) * 100)) : 0;
      if (Math.abs(p - progress) >= 2) {
        setUserBookProgress(b.id, uid, p);
        setProgress(p);
      }
    };

    el.addEventListener("scroll", onScroll);
    return () => {
      clearTimeout(t);
      el.removeEventListener("scroll", onScroll);
    };
  }, [book, uid, progress]);

  if (!book) {
    return <div className="p-6 text-neutral-600">Kitob topilmadi.</div>;
  }

  // ---------- PDF: смена страницы + сохранение прогресса ----------
  function goToPage(newPage: number) {
    if (!book || book.format !== "pdf") return;
    const clamped = Math.max(1, Math.min(totalPages, Math.round(newPage)));
    setCurrentPage(clamped);
    setPageInput(String(clamped));
    const percent = Math.max(0, Math.min(100, Math.round((clamped / totalPages) * 100)));
    setUserBookProgress(book.id, uid, percent);
    setProgress(percent);
  }
  function prevPage() {
    goToPage(currentPage - 1);
  }
  function nextPage() {
    goToPage(currentPage + 1);
  }
  function jumpToInputPage() {
    const n = Number(pageInput);
    if (Number.isFinite(n)) goToPage(n);
  }

  // ---------- Рейтинг ----------
  function onRate(v: number) {
    if (!book) return;
    setUserBookRating(book.id, uid, v);
    setMyRating(v);
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{book.title}</h1>
          <p className="text-sm text-neutral-600">Muallif: {book.author} • {book.pages} sahifa</p>
        </div>

        {book.testSlug && (
          <Link
            href={`/tests/${encodeURIComponent(book.testSlug)}`}
            className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm hover:bg-neutral-50"
            title="Ushbu kitob bo‘yicha testni boshlash"
          >
            <FileText className="h-4 w-4" />
            Testni topshirish
          </Link>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-neutral-600">O‘qish:</span>
          <div className="h-2 w-56 rounded bg-neutral-200">
            <div className="h-2 rounded bg-indigo-600" style={{ width: `${progress}%` }} />
          </div>
          <span className="text-sm text-neutral-600">{progress}%</span>
        </div>

        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => onRate(n)}
              className="p-0.5"
              aria-label={`rate ${n}`}
              title={`Baholash: ${n}`}
            >
              <Star className={`h-5 w-5 ${n <= myRating ? "fill-yellow-400 stroke-yellow-400" : "stroke-neutral-400"}`} />
            </button>
          ))}
        </div>
      </div>

      {/* Панель управления PDF (показывается только для PDF) */}
      {book.format === "pdf" && (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border bg-white p-3 text-sm">
          <button
            onClick={prevPage}
            className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 hover:bg-neutral-50"
            title="Oldingi sahifa"
          >
            <ChevronLeft className="h-4 w-4" />
            Oldingi
          </button>

          <div className="flex items-center gap-2">
            <span className="text-neutral-600">Sahifa:</span>
            <input
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value.replace(/[^\d]/g, ""))}
              onKeyDown={(e) => {
                if (e.key === "Enter") jumpToInputPage();
              }}
              className="w-16 rounded-lg border px-2 py-1 text-center"
              inputMode="numeric"
            />
            <span className="text-neutral-500">/ {totalPages}</span>
            <button
              onClick={jumpToInputPage}
              className="rounded-lg border px-3 py-1.5 hover:bg-neutral-50"
              title="Sahifaga o‘tish"
            >
              O‘tish
            </button>
          </div>

          <button
            onClick={nextPage}
            className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 hover:bg-neutral-50"
            title="Keyingi sahifa"
          >
            Keyingi
            <ChevronRight className="h-4 w-4" />
          </button>

          <div className="ml-auto flex items-center gap-2">
            {pdfError && <span className="text-rose-700">{pdfError}</span>}
            <button
              onClick={() => buildPdfUrl(book, currentPage)}
              className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 hover:bg-neutral-50"
              title="Qayta yuklash"
            >
              <RotateCcw className="h-4 w-4" />
              Qayta yuklash
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 rounded-2xl border border-neutral-200 bg-white">
        {book.format === "pdf" ? (
          pdfError ? (
            <div className="p-4 text-sm">{pdfError}</div>
          ) : pdfUrl ? (
            <iframe src={pdfUrl} className="h-[80vh] w-full rounded-2xl" />
          ) : (
            <div className="p-4 text-sm text-neutral-600">PDF yuklanmoqda…</div>
          )
        ) : (
          <div ref={textRef} className="h-[70vh] overflow-auto p-6 leading-7">
            <pre className="whitespace-pre-wrap text-[15px] text-neutral-800">{book.text}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
