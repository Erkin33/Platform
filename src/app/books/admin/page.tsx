"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  getBooks,
  addTextBook,
  addPdfBook,
  removeBook,
  savePdfBlob,
  type BookItem,
} from "@/lib/books";
import { getTests, type TestItem } from "@/lib/tests";

export default function BooksAdminPage() {
  const [list, setList] = useState<BookItem[]>([]);
  const [tests, setTests] = useState<TestItem[]>([]);

  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [pages, setPages] = useState<number>(100);
  const [mode, setMode] = useState<"text" | "pdf">("pdf");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [testSlug, setTestSlug] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setList(getBooks());
    setTests(getTests());
  };
  useEffect(() => {
    load();
  }, []);

  const testOptions = useMemo(
    () =>
      tests
        .filter((t) => !!t.slug)
        .map((t) => ({ key: t.id, value: t.slug as string, label: `${t.title} (${t.subject})` })),
    [tests]
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      if (!title.trim()) throw new Error("Sarlavha kerak.");
      if (!author.trim()) throw new Error("Muallif kerak.");
      if (!pages || pages <= 0) throw new Error("Sahifalar soni > 0 bo‘lishi kerak.");
      const selected = testSlug?.trim() || undefined;
      if (mode === "text") {
        if (!text.trim()) throw new Error("Matn bo‘sh.");
        addTextBook({ title, author, pages, text, testSlug: selected });
      } else {
        if (!file) throw new Error("PDF faylni tanlang.");
        const created = addPdfBook({ title, author, pages, testSlug: selected });
        await savePdfBlob(created.id, file);
      }
      setTitle("");
      setAuthor("");
      setPages(100);
      setText("");
      setFile(null);
      setTestSlug("");
      load();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Xatolik.";
      setError(msg);
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
          <input className="rounded-xl border px-3 py-2" placeholder="Sarlavha" value={title} onChange={(e) => setTitle(e.target.value)} />
          <input className="rounded-xl border px-3 py-2" placeholder="Muallif" value={author} onChange={(e) => setAuthor(e.target.value)} />
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <input type="number" className="rounded-xl border px-3 py-2" placeholder="Sahifalar soni" value={pages} onChange={(e) => setPages(Number(e.target.value))} min={1} />
          <select className="rounded-xl border px-3 py-2" value={mode} onChange={(e) => setMode(e.target.value as "text" | "pdf")}>
            <option value="pdf">PDF (yuklash)</option>
            <option value="text">Matn (qo‘lda)</option>
          </select>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <select className="rounded-xl border px-3 py-2" value={testSlug} onChange={(e) => setTestSlug(e.target.value)}>
            <option value="">Test biriktirilmagan</option>
            {testOptions.map((o) => (
              <option key={o.key} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          <Link href="/tests" className="rounded-xl border px-3 py-2 text-center text-sm hover:bg-neutral-50">
            Testlar ro‘yxati
          </Link>
        </div>

        {mode === "pdf" ? (
          <div>
            <input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="w-full rounded-xl border px-3 py-2" />
            <p className="mt-1 text-xs text-neutral-500">PDF IndexedDB ga saqlanadi.</p>
          </div>
        ) : (
          <textarea className="w-full rounded-xl border px-3 py-2" rows={6} placeholder="Kitob matni..." value={text} onChange={(e) => setText(e.target.value)} />
        )}

        {error && <div className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}

        <div className="flex justify-end">
          <button className="rounded-xl bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700">Qo‘shish</button>
        </div>
      </form>

      <div className="mt-6 space-y-3">
        {list.map((b) => (
          <div key={b.id} className="flex items-center justify-between rounded-2xl border bg-white p-4">
            <div className="min-w-0">
              <div className="truncate font-medium">{b.title}</div>
              <div className="text-xs text-neutral-500">
                {b.author} • {b.pages} sahifa • {b.format.toUpperCase()}
                {b.testSlug ? ` • Test: ${b.testSlug}` : ""}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link href={`/books/${encodeURIComponent(b.slug || b.id)}`} className="rounded-xl border px-3 py-1.5 text-sm hover:bg-neutral-50">
                Ko‘rish
              </Link>
              <button onClick={() => onDelete(b.id)} className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-1.5 text-sm text-rose-700 hover:bg-rose-100">
                O‘chirish
              </button>
            </div>
          </div>
        ))}
        {list.length === 0 && <div className="rounded-2xl border bg-white p-4 text-sm text-neutral-500">Hozircha kitoblar yo‘q.</div>}
      </div>
    </div>
  );
}
