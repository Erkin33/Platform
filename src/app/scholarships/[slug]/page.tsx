// src/app/scholarships/[slug]/page.tsx
"use client";

import { use, useCallback, useEffect, useState } from "react";
import { CalendarDays, Users } from "lucide-react";
import {
  getBySlug,
  applyFor,
  withdrawApplication,
  isApplied,
  effectiveStatus,
  APPLICATIONS_CHANGED,
  SCHOLARSHIPS_CHANGED,
  type Scholarship,
  formatAmount,
} from "@/lib/scholarships";
import { getUser } from "@/lib/user";

export default function ScholarshipDetails(props: { params: Promise<{ slug: string }> }) {
  const { slug } = use(props.params);

  const [uid, setUid] = useState("current");
  const [item, setItem] = useState<Scholarship | null>(null);
  const [applied, setApplied] = useState(false);

  const load = useCallback(() => {
    const u = getUser();
    const id = u.name || "current";
    setUid(id);
    const s = getBySlug(slug) || null;
    setItem(s);
    setApplied(s ? isApplied(s, id) : false);
  }, [slug]);

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
  }, [load]);

  if (!item) return <div className="text-neutral-600">Topilmadi.</div>;

  const ef = effectiveStatus(item);
  const disabled = ef === "closed";

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{item.title}</h1>
          <div className="mt-2 grid grid-cols-1 gap-2 text-[13px] text-neutral-700 sm:grid-cols-3">
            <div><b>{formatAmount(item.amount, item.currency)}</b></div>
            <div className="inline-flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-neutral-500" />
              Oxirgi muddat: {new Date(item.deadline).toLocaleDateString("uz-UZ")}
            </div>
            <div className="inline-flex items-center gap-2">
              <Users className="h-4 w-4 text-neutral-500" />
              {item.applicants.length} ariza
            </div>
          </div>
        </div>

        <div className="shrink-0">
          {!applied ? (
            <button
              id="apply"
              disabled={disabled}
              onClick={() => applyFor(item.id, uid)}
              className={`rounded-xl px-4 py-2 text-sm font-medium text-white ${disabled ? "bg-neutral-400" : "bg-indigo-600 hover:bg-indigo-700"}`}
            >
              Ariza berish
            </button>
          ) : (
            <button
              onClick={() => withdrawApplication(item.id, uid)}
              className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-2 text-sm text-rose-700 hover:bg-rose-100"
            >
              Arizani bekor qilish
            </button>
          )}
        </div>
      </header>

      <section className="rounded-2xl border bg-white p-5">
        <h3 className="text-[15px] font-semibold">Tavsif</h3>
        <p className="mt-1 whitespace-pre-wrap text-[14px] text-neutral-700">{item.description ?? "—"}</p>
      </section>
    </div>
  );
}
