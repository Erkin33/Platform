"use client";

import { useEffect, useState } from "react";
import {
  getClubs,
  addClub,
  updateClub,
  removeClub,
  type ClubItem,
  type ClubCategory,
} from "@/lib/clubs";

export default function ClubsAdminPage() {
  const [list, setList] = useState<ClubItem[]>([]);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<ClubCategory>("Professional");
  const [nextMeeting, setNextMeeting] = useState<string>("");
  const [description, setDescription] = useState("");
  const [editing, setEditing] = useState<ClubItem | null>(null);

  const load = () => setList(getClubs().sort((a,b)=>b.createdAt-a.createdAt));
  useEffect(() => { load(); }, []);

  function resetForm() {
    setTitle("");
    setCategory("Professional");
    setNextMeeting("");
    setDescription("");
    setEditing(null);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    if (editing) {
      updateClub(editing.id, { title, category, nextMeeting: nextMeeting || undefined, description });
    } else {
      addClub({ title, category, nextMeeting: nextMeeting || undefined, description });
    }
    resetForm();
    load();
  }

  function onEdit(c: ClubItem) {
    setEditing(c);
    setTitle(c.title);
    setCategory(c.category);
    setNextMeeting(c.nextMeeting ?? "");
    setDescription(c.description ?? "");
  }

  function onDelete(id: string) {
    if (!confirm("O‘chirish?")) return;
    removeClub(id);
    if (editing?.id === id) resetForm();
    load();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">Klublar — admin</h1>

      <form onSubmit={onSubmit} className="space-y-3 rounded-2xl border bg-white p-4">
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            className="rounded-xl border px-3 py-2"
            placeholder="Sarlavha"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <select
            className="rounded-xl border px-3 py-2"
            value={category}
            onChange={(e) => setCategory(e.target.value as ClubCategory)}
          >
            <option>Professional</option>
            <option>Takvim</option>
            <option>Boshqaruv</option>
            <option>Sport</option>
            <option>Fan</option>
          </select>
        </div>

        <input
          type="date"
          className="w-full rounded-xl border px-3 py-2"
          value={nextMeeting}
          onChange={(e) => setNextMeeting(e.target.value)}
          placeholder="Keyingi uchrashuv (ixtiyoriy)"
        />

        <textarea
          className="w-full rounded-xl border px-3 py-2"
          rows={4}
          placeholder="Tavsif (ixtiyoriy)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div className="flex justify-end gap-2">
          {editing && (
            <button type="button" onClick={resetForm} className="rounded-xl border px-4 py-2">
              Bekor qilish
            </button>
          )}
          <button className="rounded-xl bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700">
            {editing ? "Saqlash" : "Qo‘shish"}
          </button>
        </div>
      </form>

      <div className="space-y-3">
        {list.map(c => (
          <div key={c.id} className="flex items-center justify-between rounded-2xl border bg-white p-4">
            <div>
              <div className="font-medium">{c.title}</div>
              <div className="text-xs text-neutral-500">
                {c.category} {c.nextMeeting ? `• Keyingi: ${formatDate(c.nextMeeting)}` : ""} • {c.members.length} a‘zo
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a className="rounded-xl border px-3 py-1.5 text-sm hover:bg-neutral-50" href={`/clubs/${encodeURIComponent(c.slug)}`}>
                Ko‘rish
              </a>
              <button onClick={() => onEdit(c)} className="rounded-xl border px-3 py-1.5 text-sm hover:bg-neutral-50">
                Tahrirlash
              </button>
              <button
                onClick={() => onDelete(c.id)}
                className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-1.5 text-sm text-rose-700 hover:bg-rose-100"
              >
                O‘chirish
              </button>
            </div>
          </div>
        ))}
        {list.length === 0 && (
          <div className="rounded-2xl border bg-white p-4 text-sm text-neutral-500">
            Hozircha klublar yo‘q.
          </div>
        )}
      </div>
    </div>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("uz-UZ", { year: "numeric", month: "2-digit", day: "2-digit" });
}