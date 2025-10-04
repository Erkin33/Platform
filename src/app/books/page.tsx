"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getBooks,
  BOOKS_CHANGED,
  BOOK_PROGRESS_CHANGED,
  BOOK_RATING_CHANGED,
  type BookItem,
  getAverageRating,
  getUserBookProgress,
} from "@/lib/books";
import { getUser, type Role } from "@/lib/user";
import Link from "next/link";
import { Star, FileText } from "lucide-react";

export default function BooksPage() {
  const [q, setQ] = useState("");
  const [role, setRole] = useState<Role | null>(null);
  const [uid, setUid] = useState("current");
  const [list, setList] = useState<BookItem[]>([]);

  function load() {
    const u = getUser();
    setRole(u.role);
    setUid(u.name || "current");
    setList(getBooks());
  }

  useEffect(() => {
    load();
    const on = () => load();
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
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const items = list.slice().sort((a, b) => b.createdAt - a.createdAt);
    if (!s) return items;
    return items.filter(
      (b) =>
        b.title.toLowerCase().includes(s) ||
        b.author.toLowerCase().includes(s)
    );
  }, [list, q]);

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Kitoblar</h1>
        <div className="flex items-center gap-2">
          <input
            className="w-64 rounded-xl border px-3 py-2 text-sm"
            placeholder="Kitob qidirish..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {role === "admin" && (
            <Link
              href="/books/admin"
              className="rounded-xl bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              + Yangi kitob
            </Link>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {filtered.map((b) => (
          <BookRow key={b.id} b={b} uid={uid} />
        ))}
        {filtered.length === 0 && (
          <div className="rounded-2xl border border-neutral-200 bg-white px-5 py-6 text-sm text-neutral-500">
            Hech narsa topilmadi.
          </div>
        )}
      </div>
    </div>
  );
}

function BookRow({ b, uid }: { b: BookItem; uid: string }) {
  const progress = getUserBookProgress(b, uid);
  const avg = getAverageRating(b);
  const url = `/books/${encodeURIComponent(b.slug || b.id)}`;

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white px-5 py-4">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="truncate text-[16px] font-semibold text-neutral-900">
            {b.title}
          </div>
          <div className="text-[13px] text-neutral-600">
            Muallif: {b.author} • {b.pages} sahifa
          </div>

          <div className="mt-3">
            <div className="mb-1 text-[12px] text-neutral-600">O‘qish jarayoni</div>
            <div className="h-2 w-full rounded bg-neutral-200">
              <div
                className="h-2 rounded bg-indigo-600"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-1 text-right text-[12px] text-neutral-500">
              {progress}%
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div className="flex items-center gap-1 text-[12px] text-neutral-600">
            <Star className="h-4 w-4 fill-yellow-400 stroke-yellow-400" />
            {avg}
          </div>

          {b.testSlug && (
            <Link
              href={`/tests/${encodeURIComponent(b.testSlug)}`}
              className="inline-flex items-center gap-1 rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50"
              title="Ushbu kitob bo‘yicha test"
            >
              <FileText className="h-4 w-4" /> Test
            </Link>
          )}

          <Link
            href={url}
            className="rounded-xl bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            {progress > 0 ? "Davom etish" : "Boshlash"}
          </Link>
        </div>
      </div>
    </div>
  );
}
