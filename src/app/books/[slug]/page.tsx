"use client";

import { use, useEffect, useRef, useState } from "react";
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
import { Star } from "lucide-react";

export default function BookReaderPage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = use(props.params);

  // Все хуки объявляем до любых условных return
  const textRef = useRef<HTMLDivElement>(null);

  const [book, setBook] = useState<BookItem | null>(null);
  const [uid, setUid] = useState("current");
  const [progress, setProgress] = useState(0);   // 0..100
  const [myRating, setMyRating] = useState(0);   // 1..5
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  function loadAll() {
    const u = getUser();
    const id = u.name || "current";
    setUid(id);

    const b = getBookBySlugOrId(slug) || null;
    setBook(b);
    if (b) {
      const p = getUserBookProgress(b, id);
      setProgress(p);
      setMyRating(getUserBookRating(b, id));
    } else {
      setProgress(0);
      setMyRating(0);
    }
  }

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
  }, [slug]);

  // PDF: грузим blob и создаём objectURL; для резюме считаем страницу из progress
  useEffect(() => {
    if (!book || book.format !== "pdf") {
      setPdfUrl(null);
      return;
    }
    let url: string | null = null;

    const totalPages = Math.max(1, book.pages || 1);
    const resumePage =
      Math.min(totalPages, Math.max(1, Math.round(((progress || 0) / 100) * totalPages))) || 1;

    getPdfBlob(book.id)
      .then((blob) => {
        if (!blob) return;
        const base = URL.createObjectURL(blob);
        url = `${base}#page=${resumePage}&view=FitH`;
        setPdfUrl(url);
      })
      .catch(() => setPdfUrl(null));

    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [book?.id, book?.format, book?.pages, progress]);

  // TEXT: автотрекинг по скроллу + автопролист на сохранённую позицию
  useEffect(() => {
    if (!book || book.format !== "text") return;
    const el = textRef.current;
    if (!el) return;

    // восстановить прокрутку по сохранённому проценту
    const restore = () => {
      const max = el.scrollHeight - el.clientHeight;
      if (max > 0) el.scrollTop = Math.round((progress / 100) * max);
    };
    const t = setTimeout(restore, 0);

    const onScroll = () => {
      const max = el.scrollHeight - el.clientHeight;
      const p = max > 0 ? Math.min(100, Math.round((el.scrollTop / max) * 100)) : 0;
      if (Math.abs(p - progress) >= 2) {
        // здесь book гарантированно не null (мы в эффекте с проверкой выше),
        // поэтому используем non-null assertion
        setUserBookProgress(book!.id, uid, p);
        setProgress(p);
      }
    };

    el.addEventListener("scroll", onScroll);
    return () => {
      clearTimeout(t);
      el.removeEventListener("scroll", onScroll);
    };
  }, [book?.id, book?.format, uid, progress]);

  // Если книга не найдена — показываем заглушку
  if (!book) {
    return <div className="text-neutral-600">Kitob topilmadi.</div>;
  }

  // После проверки можно безопасно «зафиксировать» ненулевой объект,
  // чтобы TS больше не ругался в коллбеках ниже.
  const b = book as BookItem;

  function onRate(v: number) {
    setUserBookRating(b.id, uid, v);
    setMyRating(v);
  }

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-semibold">{b.title}</h1>
      <p className="text-sm text-neutral-600">
        Muallif: {b.author} • {b.pages} sahifa
      </p>

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
              <Star
                className={`h-5 w-5 ${n <= myRating ? "fill-yellow-400 stroke-yellow-400" : "stroke-neutral-400"}`}
              />
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-neutral-200 bg-white">
        {b.format === "pdf" ? (
          pdfUrl ? (
            <object data={pdfUrl} type="application/pdf" className="h-[80vh] w-full rounded-2xl">
              <div className="p-4 text-sm text-neutral-600">PDF ko‘rsatilmadi.</div>
            </object>
          ) : (
            <div className="p-4 text-sm text-neutral-600">PDF yuklanmoqda yoki mavjud emas.</div>
          )
        ) : (
          <div ref={textRef} className="h-[70vh] overflow-auto p-6 leading-7">
            <pre className="whitespace-pre-wrap text-[15px] text-neutral-800">{b.text}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
