"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Minus } from "lucide-react";
import { getUser, type Role } from "@/lib/user";

/* ===== Типы и ключи ===== */
type Course = { id: string; title: string; teacher: string };
type Attendance = { courseId: string; total: number; attended: number };

const K = {
  COURSES: "uniplatform_att_courses_v1",
  STATS: "uniplatform_att_stats_v1",
} as const;

const isBrowser = () => typeof window !== "undefined";
const lsGet = <T,>(key: string, fb: T): T => {
  if (!isBrowser()) return fb;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fb;
  } catch {
    return fb;
  }
};
/** ВАЖНО: рассылаем storage-ивент асинхронно, чтобы не триггерить Topbar в середине чужого рендера */
const lsSet = <T,>(key: string, val: T) => {
  if (!isBrowser()) return;
  window.localStorage.setItem(key, JSON.stringify(val));
  // Отправим событие после завершения текущего рендера
  try {
    setTimeout(() => {
      window.dispatchEvent(
        new StorageEvent("storage", { key, newValue: JSON.stringify(val) })
      );
    }, 0);
  } catch {}
};

export default function DavomatCoursePage(
  props: { params: Promise<{ id: string }> }
) {
  const { id } = use(props.params);

  const [mounted, setMounted] = useState(false);
  const [role, setRole] = useState<Role | null>(null);

  const [course, setCourse] = useState<Course | null>(null);
  const [stat, setStat] = useState<Attendance | null>(null);

  useEffect(() => {
    setMounted(true);
    const u = getUser();
    setRole(u.role);
    load();
    const onStorage = (e: StorageEvent) => {
      if (!e.key || [K.COURSES, K.STATS].includes(e.key as any)) load();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function load() {
    const courses = lsGet<Course[]>(K.COURSES, []);
    const stats = lsGet<Attendance[]>(K.STATS, []);
    setCourse(courses.find((c) => c.id === id) || null);
    setStat(stats.find((s) => s.courseId === id) || { courseId: id, total: 0, attended: 0 });
  }

  const pct = useMemo(() => {
    if (!stat || stat.total === 0) return 0;
    return Math.max(0, Math.min(100, Math.round((stat.attended / stat.total) * 100)));
  }, [stat]);

  function updateStat(patch: Partial<Attendance>) {
    setStat((prev) => {
      const next: Attendance = { ...(prev || { courseId: id, total: 0, attended: 0 }), ...patch };
      const list = lsGet<Attendance[]>(K.STATS, []);
      const i = list.findIndex((s) => s.courseId === id);
      if (i >= 0) list[i] = next;
      else list.push(next);
      lsSet(K.STATS, list); // <-- асинхронный storage-ивент
      return next;
    });
  }

  const isAdmin = role === "admin";

  if (!mounted) {
    return (
      <div className="mx-auto max-w-[1024px]">
        <div className="mt-4 h-6 w-48 rounded bg-neutral-200 animate-pulse" />
        <div className="mt-3 h-4 w-80 rounded bg-neutral-200 animate-pulse" />
        <div className="mt-6 h-24 w-full rounded-2xl border bg-white" />
      </div>
    );
  }

  if (!course || !stat) {
    return (
      <div className="mx-auto max-w-[1024px]">
        <div className="flex items-center gap-3">
          <Link
            className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50"
            href="/davomat"
          >
            <ArrowLeft className="h-4 w-4" /> Orqaga
          </Link>
          <div className="text-neutral-600">Bo‘lim topilmadi.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1024px]">
      {/* Header */}
      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50"
            href="/davomat"
          >
            <ArrowLeft className="h-4 w-4" /> Davomat
          </Link>
          <h1 className="text-xl font-semibold">{course.title}</h1>
        </div>

        <div className="text-right">
          <div className="text-[28px] font-bold leading-none">{pct}%</div>
          <div className="text-[12px] text-neutral-500">Davomat foizi</div>
        </div>
      </div>

      {/* Card */}
      <div className="mt-5 rounded-2xl border border-neutral-200 bg-white p-5">
        <div className="text-[13px] text-neutral-600">O‘qituvchi: {course.teacher}</div>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <div className="text-[12px] text-neutral-500">Jami darslar</div>
            <div className="mt-1 flex items-center gap-2">
              <div className="text-[16px] font-semibold">{stat.total}</div>
              {isAdmin && (
                <div className="flex items-center gap-1">
                  <button
                    className="rounded-lg border px-2 py-1 text-sm hover:bg-neutral-50"
                    onClick={() =>
                      updateStat({
                        total: Math.max(0, stat.total - 1),
                        attended: Math.min(stat.attended, Math.max(0, stat.total - 1)),
                      })
                    }
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <button
                    className="rounded-lg border px-2 py-1 text-sm hover:bg-neutral-50"
                    onClick={() => updateStat({ total: stat.total + 1 })}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="text-[12px] text-neutral-500">Qatnashgan</div>
            <div className="mt-1 flex items-center gap-2">
              <div className="text-[16px] font-semibold text-emerald-600">{stat.attended}</div>
              {isAdmin && (
                <div className="flex items-center gap-1">
                  <button
                    className="rounded-lg border px-2 py-1 text-sm hover:bg-neutral-50"
                    onClick={() => updateStat({ attended: Math.max(0, stat.attended - 1) })}
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <button
                    className="rounded-lg border px-2 py-1 text-sm hover:bg-neutral-50"
                    onClick={() => updateStat({ attended: Math.min(stat.total, stat.attended + 1) })}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="sm:col-span-3">
            <div className="text-[12px] text-neutral-500">Foiz</div>
            <div className="mt-2 h-2 w-full rounded bg-neutral-200">
              <div className="h-2 rounded bg-amber-500" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>
      </div>

      {isAdmin && (
        <p className="mt-3 text-[12px] text-neutral-500">
          Admin: `{stat.total}` — jami darslar, `{stat.attended}` — qatnashgan. Кнопки выше сразу сохраняют данные.
        </p>
      )}
    </div>
  );
}
