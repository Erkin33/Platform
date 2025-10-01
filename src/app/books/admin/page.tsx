"use client";

import { useEffect, useState } from "react";
import {
  getBooks,
  addTextBook,
  addPdfBook,
  removeBook,
  savePdfBlob,
  type BookItem,
} from "@/lib/books";

export default function BooksAdminPage() {
  const [list, setList] = useState<BookItem[]>([]);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [pages, setPages] = useState<number>(100);
  const [mode, setMode] = useState<"text" | "pdf">("pdf");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => setList(getBooks());
  useEffect(() => {
    load();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    try {
      if (!title.trim()) throw new Error("Sarlavha kerak.");
      if (!author.trim()) throw new Error("Muallif kerak.");
      if (!pages || pages <= 0) throw new Error("Sahifalar soni > 0 bo‘lishi kerak.");

      if (mode === "text") {
        if (!text.trim()) throw new Error("Matn bo‘sh.");
        addTextBook({ title, author, pages, text });
      } else {
        if (!file) throw new Error("PDF faylni tanlang.");
        // 1) добавляем метаданные
        const created = addPdfBook({ title, author, pages });
        // 2) сохраняем сам PDF в IndexedDB
        await savePdfBlob(created.id, file);
      }

      setTitle("");
      setAuthor("");
      setPages(100);
      setText("");
      setFile(null);
      load();
    } catch (err: any) {
      setError(err?.message || "Xatolik.");
    }
  }

  function onDelete(id: string) {
    if (!confirm("O‘chirish?")) return;
    removeBook(id);
    load();
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold">Kitoblar — admin</h1>

      <form onSubmit={onSubmit} className="mt-5 space-y-3 rounded-2xl border bg-white p-4">
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            className="rounded-xl border px-3 py-2"
            placeholder="Sarlavha"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <input
            className="rounded-xl border px-3 py-2"
            placeholder="Muallif"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
          />
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <input
            type="number"
            className="rounded-xl border px-3 py-2"
            placeholder="Sahifalar soni"
            value={pages}
            onChange={(e) => setPages(Number(e.target.value))}
            min={1}
          />

          <select
            className="rounded-xl border px-3 py-2"
            value={mode}
            onChange={(e) => setMode(e.target.value as "text" | "pdf")}
          >
            <option value="pdf">PDF (yuklash)</option>
            <option value="text">Matn (qo‘lda)</option>
          </select>
        </div>

        {mode === "pdf" ? (
          <div>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full rounded-xl border px-3 py-2"
            />
            <p className="mt-1 text-xs text-neutral-500">
              Eslatma: PDF IndexedDB ga saqlanadi (ko‘proq joy); localStorage ga emas.
            </p>
          </div>
        ) : (
          <textarea
            className="w-full rounded-xl border px-3 py-2"
            rows={6}
            placeholder="Kitob matni..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        )}

        {error && (
          <div className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>
        )}

        <div className="flex justify-end">
          <button className="rounded-xl bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700">
            Qo‘shish
          </button>
        </div>
      </form>

      <div className="mt-6 space-y-3">
        {list.map((b) => (
          <div key={b.id} className="flex items-center justify-between rounded-2xl border bg-white p-4">
            <div>
              <div className="font-medium">{b.title}</div>
              <div className="text-xs text-neutral-500">
                {b.author} • {b.pages} sahifa • {b.format.toUpperCase()}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a
                className="rounded-xl border px-3 py-1.5 text-sm hover:bg-neutral-50"
                href={`/books/${encodeURIComponent(b.slug)}`}
              >
                Ko‘rish
              </a>
              <button
                onClick={() => onDelete(b.id)}
                className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-1.5 text-sm text-rose-700 hover:bg-rose-100"
              >
                O‘chirish
              </button>
            </div>
          </div>
        ))}
        {list.length === 0 && (
          <div className="rounded-2xl border bg-white p-4 text-sm text-neutral-500">
            Hozircha kitoblar yo‘q.
          </div>
        )}
      </div>
    </div>
  );
}
