"use client";

import { use, useCallback, useEffect, useState } from "react";
import { CalendarDays, Users, Check } from "lucide-react";
import {
  getBySlug,
  applyFor,
  withdrawApplication,
  isApplied,
  effectiveStatus,
  APPLICATIONS_CHANGED,
  SCHOLARSHIPS_CHANGED,
  PROGRESS_CHANGED,
  type Scholarship,
  formatAmount,
  getChecklist,
  getUserChecklist,
  setTaskDone,
  getProgressPercent,
} from "@/lib/scholarships";
import { getUser, type Role } from "@/lib/user";

export default function ScholarshipDetails(props: { params: Promise<{ slug: string }> }) {
  const { slug } = use(props.params);

  const [role, setRole] = useState<Role>("student");
  const [uid, setUid] = useState("current");
  const [item, setItem] = useState<Scholarship | null>(null);
  const [applied, setApplied] = useState(false);

  const load = useCallback(() => {
    const u = getUser();
    setRole(u.role);
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
    window.addEventListener(PROGRESS_CHANGED, on);
    window.addEventListener("storage", on);
    return () => {
      window.removeEventListener(SCHOLARSHIPS_CHANGED, on);
      window.removeEventListener(APPLICATIONS_CHANGED, on);
      window.removeEventListener(PROGRESS_CHANGED, on);
      window.removeEventListener("storage", on);
    };
  }, [load]);

  if (!item) return <div className="text-neutral-600">Topilmadi.</div>;

  const it: Scholarship = item;
  const ef = effectiveStatus(it);
  const disabled = ef === "closed";

  const tasks = getChecklist(it);
  const state = getUserChecklist(it.id, uid);
  const percent = getProgressPercent(it, uid);

  function toggleTask(taskId: string) {
    const next = !state[taskId];
    setTaskDone(it.id, uid, taskId, next);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{it.title}</h1>
          <div className="mt-2 grid grid-cols-1 gap-2 text-[13px] text-neutral-700 sm:grid-cols-3">
            <div>
              <b>{formatAmount(it.amount, it.currency)}</b>
            </div>
            <div className="inline-flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-neutral-500" />
              Oxirgi muddat: {new Date(it.deadline).toLocaleDateString("uz-UZ")}
            </div>
            <div className="inline-flex items-center gap-2">
              <Users className="h-4 w-4 text-neutral-500" />
              {it.applicants.length} ariza
            </div>
          </div>
        </div>

        <div className="shrink-0">
          {!applied ? (
            <button
              id="apply"
              disabled={disabled}
              onClick={() => applyFor(it.id, uid)}
              className={`rounded-xl px-4 py-2 text-sm font-medium text-white ${
                disabled ? "bg-neutral-400" : "bg-indigo-600 hover:bg-indigo-700"
              }`}
            >
              Ariza berish
            </button>
          ) : (
            <button
              onClick={() => withdrawApplication(it.id, uid)}
              className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-2 text-sm text-rose-700 hover:bg-rose-100"
            >
              Arizani bekor qilish
            </button>
          )}
        </div>
      </header>

      <section className="rounded-2xl border bg-white p-5">
        <h3 className="text-[15px] font-semibold">Tavsif</h3>
        <p className="mt-1 whitespace-pre-wrap text-[14px] text-neutral-700">
          {it.description ?? "—"}
        </p>
      </section>

      {/* ТОЛЬКО личный прогресс студента, без списков участников и решений */}
      <section className="rounded-2xl border bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[15px] font-semibold">Talablar (progress)</h3>
          <div className="flex items-center gap-2">
            <div className="h-2 w-48 rounded bg-neutral-200">
              <div className="h-2 rounded bg-indigo-600" style={{ width: `${percent}%` }} />
            </div>
            <span className="text-sm text-neutral-600">{percent}%</span>
          </div>
        </div>

        <ul className="space-y-2">
          {tasks.map((t) => {
            const done = !!state[t.id];
            return (
              <li key={t.id} className="flex items-center justify-between rounded-xl border px-3 py-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={done}
                    onChange={() => toggleTask(t.id)}
                  />
                  <span className={`text-sm ${done ? "line-through text-neutral-500" : ""}`}>{t.title}</span>
                </div>
                {done && <Check className="h-4 w-4 text-emerald-600" />}
              </li>
            );
          })}
          {tasks.length === 0 && <li className="text-sm text-neutral-500">Talablar yo‘q.</li>}
        </ul>
      </section>

      {/* НИКАКИХ админских блоков на этой странице */}
      {role === "admin" ? (
        <div className="rounded-2xl border bg-amber-50 p-4 text-[13px] text-amber-800">
          Admin boshqaruvi uchun alohida sahifa: <b>/scholarships/admin</b>
        </div>
      ) : null}
    </div>
  );
}
