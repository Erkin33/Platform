// src/app/scholarships/admin/page.tsx
"use client";

import { useEffect, useState } from "react";
import {
  getScholarships,
  addScholarship,
  updateScholarship,
  removeScholarship,
  type Scholarship,
  type Currency,
} from "@/lib/scholarships";

export default function ScholarshipsAdminPage() {
  const [list, setList] = useState<Scholarship[]>([]);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState<number>(1000000);
  const [currency, setCurrency] = useState<Currency>("UZS");
  const [deadline, setDeadline] = useState<string>("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"open" | "closed">("open");
  const [editing, setEditing] = useState<Scholarship | null>(null);

  const load = () =>
    setList(getScholarships().sort((a, b) => b.createdAt - a.createdAt));
  useEffect(() => {
    load();
  }, []);

  function reset() {
    setTitle("");
    setAmount(1000000);
    setCurrency("UZS");
    setDeadline("");
    setDescription("");
    setStatus("open");
    setEditing(null);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    if (!deadline) return;

    if (editing) {
      updateScholarship(editing.id, {
        title,
        amount,
        currency,
        deadline,
        description,
        status,
      });
    } else {
      addScholarship({ title, amount, currency, deadline, description, status });
    }
    reset();
    load();
  }

  function onEdit(s: Scholarship) {
    setEditing(s);
    setTitle(s.title);
    setAmount(s.amount);
    setCurrency(s.currency);
    setDeadline(s.deadline);
    setDescription(s.description ?? "");
    setStatus(s.status);
  }

  function onDelete(id: string) {
    if (!confirm("O‘chirish?")) return;
    removeScholarship(id);
    if (editing?.id === id) reset();
    load();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">Stipendiyalar — admin</h1>

      <form onSubmit={onSubmit} className="space-y-3 rounded-2xl border bg-white p-4">
        <input
          className="w-full rounded-xl border px-3 py-2"
          placeholder="Sarlavha"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <div className="grid gap-2 sm:grid-cols-3">
          <input
            type="number"
            className="rounded-xl border px-3 py-2"
            placeholder="Miqdori"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            min={0}
          />
          <select
            className="rounded-xl border px-3 py-2"
            value={currency}
            onChange={(e) => setCurrency(e.target.value as Currency)}
          >
            <option value="UZS">UZS</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </select>
          <input
            type="date"
            className="rounded-xl border px-3 py-2"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
        </div>

        <select
          className="rounded-xl border px-3 py-2"
          value={status}
          onChange={(e) => setStatus(e.target.value as "open" | "closed")}
        >
          <option value="open">Ochiq</option>
          <option value="closed">Yopiq</option>
        </select>

        <textarea
          className="w-full rounded-xl border px-3 py-2"
          rows={4}
          placeholder="Tavsif (ixtiyoriy)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div className="flex justify-end gap-2">
          {editing && (
            <button
              type="button"
              onClick={reset}
              className="rounded-xl border px-4 py-2"
            >
              Bekor qilish
            </button>
          )}
          <button className="rounded-xl bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700">
            {editing ? "Saqlash" : "Qo‘shish"}
          </button>
        </div>
      </form>

      <div className="space-y-3">
        {list.map((s) => (
          <div
            key={s.id}
            className="flex items-center justify-between rounded-2xl border bg-white p-4"
          >
            <div>
              <div className="font-medium">{s.title}</div>
              <div className="text-xs text-neutral-500">
                {s.amount} {s.currency} •{" "}
                {new Date(s.deadline).toLocaleDateString("uz-UZ")} •{" "}
                {s.applicants.length} ariza
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a
                className="rounded-xl border px-3 py-1.5 text-sm hover:bg-neutral-50"
                href={`/scholarships/${encodeURIComponent(s.slug)}`}
              >
                Batafsil
              </a>
              <button
                onClick={() => onEdit(s)}
                className="rounded-xl border px-3 py-1.5 text-sm hover:bg-neutral-50"
              >
                Tahrirlash
              </button>
              <button
                onClick={() => onDelete(s.id)}
                className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-1.5 text-sm text-rose-700 hover:bg-rose-100"
              >
                O‘chirish
              </button>
            </div>
          </div>
        ))}
        {list.length === 0 && (
          <div className="rounded-2xl border bg-white p-4 text-sm text-neutral-500">
            Hozircha e&apos;lonlar yo‘q.
          </div>
        )}
      </div>
    </div>
  );
}
