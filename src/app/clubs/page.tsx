// src/app/clubs/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, Users } from "lucide-react";
import {
  getClubs,
  CLUBS_CHANGED,
  MEMBERSHIP_CHANGED,
  myClubs,
  joinClub,
  leaveClub,
  type ClubItem,
  isMember,
} from "@/lib/clubs";
import { getUser, type Role } from "@/lib/user";

export default function ClubsPage() {
  const [role, setRole] = useState<Role | null>(null);
  const [uid, setUid] = useState("current");
  const [query, setQuery] = useState("");
  const [clubs, setClubs] = useState<ClubItem[]>([]);
  const [mine, setMine] = useState<ClubItem[]>([]);

  const load = () => {
    const u = getUser();
    setRole(u.role);
    const id = u.name || "current";
    setUid(id);
    setClubs(getClubs());
    setMine(myClubs(id));
  };

  useEffect(() => {
    load();
    const on = () => load();
    window.addEventListener(CLUBS_CHANGED, on);
    window.addEventListener(MEMBERSHIP_CHANGED, on);
    window.addEventListener("storage", on);
    return () => {
      window.removeEventListener(CLUBS_CHANGED, on);
      window.removeEventListener(MEMBERSHIP_CHANGED, on);
      window.removeEventListener("storage", on);
    };
  }, []);

  const filtered = useMemo(() => {
    const s = query.trim().toLowerCase();
    const items = clubs
      .filter((c) => c.status === "active")
      .sort((a, b) => b.createdAt - a.createdAt);
    if (!s) return items;
    return items.filter(
      (c) =>
        c.title.toLowerCase().includes(s) ||
        (c.description ?? "").toLowerCase().includes(s) ||
        c.category.toLowerCase().includes(s)
    );
  }, [clubs, query]);

  return (
    <div className="space-y-6">
      {/* header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Klublar</h1>
        <div className="flex items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-64 rounded-xl border px-3 py-2 text-sm"
            placeholder="Qidirish..."
          />
          {role === "admin" && (
            <Link
              href="/clubs/admin"
              className="rounded-xl bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Yangi klub
            </Link>
          )}
        </div>
      </div>

      {/* list */}
      <div className="space-y-4">
        {filtered.map((c) => (
          <ClubRow key={c.id} c={c} uid={uid} />
        ))}
        {filtered.length === 0 && (
          <div className="rounded-2xl border bg-white px-5 py-6 text-sm text-neutral-500">
            Hozircha klub topilmadi.
          </div>
        )}
      </div>

      {/* my clubs */}
      <section className="rounded-2xl border bg-indigo-50 p-4">
        <h3 className="text-[16px] font-semibold">Mening klublarim</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {mine.length === 0 && (
            <div className="text-sm text-neutral-600">Hali aʼzo emassiz.</div>
          )}
          {mine.map((c) => (
            <div key={c.id} className="rounded-xl border bg-white p-3">
              <div className="font-medium">{c.title}</div>
              <div className="text-xs text-neutral-500">{c.category}</div>
              <div className="mt-3">
                <Link
                  href={`/clubs/${encodeURIComponent(c.slug)}`}
                  className="rounded-xl border px-3 py-1.5 text-sm hover:bg-neutral-50"
                >
                  Chat
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ClubRow({ c, uid }: { c: ClubItem; uid: string }) {
  const member = isMember(c, uid);

  return (
    <div className="rounded-2xl border bg-white px-5 py-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="text-[16px] font-semibold">{c.title}</div>
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-700">
              {c.category}
            </span>
          </div>
          {c.description && (
            <div className="mt-1 text-[13px] text-neutral-600 line-clamp-2">
              {c.description}
            </div>
          )}
          <div className="mt-2 grid grid-cols-1 gap-2 text-[13px] text-neutral-600 sm:grid-cols-2">
            <div className="inline-flex items-center gap-2">
              <Users className="h-4 w-4 text-neutral-500" />
              {c.members.length} aʼzo
            </div>
            {c.nextMeeting && (
              <div className="inline-flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-neutral-500" />
                Keyingi: {formatDate(c.nextMeeting)}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/clubs/${encodeURIComponent(c.slug)}`}
            className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50"
          >
            Batafsil
          </Link>
          {!member ? (
            <button
              onClick={() => joinClub(c.id, uid)}
              className="rounded-xl bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Qo‘shilish
            </button>
          ) : (
            <button
              onClick={() => leaveClub(c.id, uid)}
              className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700 hover:bg-rose-100"
            >
              Tark etish
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("uz-UZ", { year: "numeric", month: "2-digit", day: "2-digit" });
}
