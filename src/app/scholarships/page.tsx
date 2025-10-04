"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, Users } from "lucide-react";
import {
  getScholarships,
  SCHOLARSHIPS_CHANGED,
  APPLICATIONS_CHANGED,
  type Scholarship,
  formatAmount,
  effectiveStatus,
} from "@/lib/scholarships";
import { getUser, type Role } from "@/lib/user";

export default function ScholarshipsPage() {
  const [role, setRole] = useState<Role | null>(null);
  const [q, setQ] = useState("");
  const [list, setList] = useState<Scholarship[]>([]);

  const load = () => {
    const u = getUser();
    setRole(u.role);
    setList(getScholarships());
  };

  useEffect(() => {
    load();
    const on = () => load();
    window.addEventListener(SCHOLARSHIPS_CHANGED, on);
    window.addEventListener(APPLICATIONS_CHANGED, on);
    window.addEventListener("storage", on);
    return () => {
      window.removeEventListener(SCHOLARSHIPS_CHANGED, on);
      window.removeEventListener(APPLICATIONS_CHANGED, on);
      window.removeEventListener("storage", on);
    };
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const items = list.slice().sort((a, b) => b.createdAt - a.createdAt);
    if (!s) return items;
    return items.filter(
      (it) =>
        it.title.toLowerCase().includes(s) ||
        (it.description ?? "").toLowerCase().includes(s)
    );
  }, [list, q]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Stipendiya va Grantlar</h1>
        <div className="flex items-center gap-2">
          <input
            className="w-64 rounded-xl border px-3 py-2 text-sm"
            placeholder="Qidirish..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {role === "admin" && (
            <Link
              href="/scholarships/admin"
              className="rounded-xl bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Yangi ariza
            </Link>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {filtered.map((s) => (
          <Row key={s.id} s={s} />
        ))}
        {filtered.length === 0 && (
          <div className="rounded-2xl border bg-white px-5 py-6 text-sm text-neutral-500">
            Hozircha e&apos;lonlar yo‘q.
          </div>
        )}
      </div>
    </div>
  );
}

function StatusPill({ s }: { s: Scholarship }) {
  const ef = effectiveStatus(s);
  if (ef === "closed")
    return (
      <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[12px] text-orange-700">
        Tugagan
      </span>
    );
  if (ef === "closing")
    return (
      <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-[12px] text-yellow-700">
        Tugaydi
      </span>
    );
  return (
    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[12px] text-emerald-700">
      Ochiq
    </span>
  );
}

function Row({ s }: { s: Scholarship }) {
  return (
    <div className="rounded-2xl border bg-white px-5 py-4">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <div className="text-[16px] font-semibold">{s.title}</div>
            <StatusPill s={s} />
          </div>
          <div className="mt-2 grid grid-cols-1 gap-2 text-[13px] text-neutral-700 sm:grid-cols-3">
            <div>
              <b>{formatAmount(s.amount, s.currency)}</b>
            </div>
            <div className="inline-flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-neutral-500" />
              {new Date(s.deadline).toLocaleDateString("uz-UZ")}
            </div>
            <div className="inline-flex items-center gap-2">
              <Users className="h-4 w-4 text-neutral-500" />
              {s.applicants.length} ariza
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={`/scholarships/${encodeURIComponent(s.slug)}`}
            className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50"
          >
            Batafsil
          </Link>
          <Link
            href={`/scholarships/${encodeURIComponent(s.slug)}#apply`}
            className="rounded-xl bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Ariza berish
          </Link>
        </div>
      </div>
    </div>
  );
}
