// src/app/davomat/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarPlus, Settings, ChevronRight } from "lucide-react";
import { getUser, type Role } from "@/lib/user";

/* ---------------- Types & LS keys ---------------- */
type Course = {
  id: string;
  title: string;
  teacher: string;
};

type Attendance = {
  courseId: string;
  total: number;     // всего занятий
  attended: number;  // присутствовал
};

const K = {
  COURSES: "uniplatform_att_courses_v1",
  STATS: "uniplatform_att_stats_v1",
} as const;

/* ---------------- Small LS helpers ---------------- */
const isBrowser = () => typeof window !== "undefined";

function lsGet<T>(key: string, fb: T): T {
  if (!isBrowser()) return fb;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fb;
  } catch {
    return fb;
  }
}

function lsEnsureSeed() {
  if (!isBrowser()) return;

  if (!window.localStorage.getItem(K.COURSES)) {
    const demoCourses: Course[] = [
      { id: "law-const", title: "Konstitutsiya huquqi", teacher: "Prof. A.Saidov" },
      { id: "law-civil", title: "Fuqarolik huquqi",    teacher: "Prof. H.Rakhmonqulov" },
      { id: "law-crim",  title: "Jinoyat huquqi",      teacher: "Dots. B.Karimov" },
    ];
    window.localStorage.setItem(K.COURSES, JSON.stringify(demoCourses));
  }
  if (!window.localStorage.getItem(K.STATS)) {
    const demoStats: Attendance[] = [
      { courseId: "law-const", total: 16, attended: 15 },
      { courseId: "law-civil", total: 18, attended: 18 },
      { courseId: "law-crim",  total: 14, attended: 13 },
    ];
    window.localStorage.setItem(K.STATS, JSON.stringify(demoStats));
  }
}

/* ---------------- Page ---------------- */
export default function DavomatPage() {
  const [mounted, setMounted] = useState(false);
  const [role, setRole] = useState<Role | null>(null);

  const [courses, setCourses] = useState<Course[] | null>(null);
  const [stats, setStats] = useState<Attendance[] | null>(null);

  // грузим всё ТОЛЬКО на клиенте
  useEffect(() => {
    setMounted(true);
    const u = getUser();
    setRole(u.role);

    lsEnsureSeed();
    loadFromLS();

    const keys = new Set<string>([K.COURSES, K.STATS]);
    const onStorage = (e: StorageEvent) => {
      if (!e.key || keys.has(e.key)) {
        loadFromLS();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  function loadFromLS() {
    setCourses(lsGet<Course[]>(K.COURSES, []));
    setStats(lsGet<Attendance[]>(K.STATS, []));
  }

  const overall = useMemo(() => {
    if (!courses || !stats) return 0;
    const m = new Map(stats.map((s) => [s.courseId, s]));
    let totalAll = 0;
    let attendedAll = 0;
    for (const c of courses) {
      const st = m.get(c.id);
      if (!st) continue;
      totalAll += st.total;
      attendedAll += st.attended;
    }
    if (totalAll === 0) return 0;
    return Math.max(0, Math.min(100, Math.round((attendedAll / totalAll) * 100)));
  }, [courses, stats]);

  return (
    <div className="mx-auto max-w-[1024px]">
      {/* ===== Header ===== */}
      <header className="mt-2 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Davomat</h1>

        <div className="flex items-center gap-3">
          {/* Общий процент */}
          {mounted && courses && stats && (
            <div className="text-right">
              <div className="text-[28px] font-bold leading-none">{overall}%</div>
              <div className="text-[12px] text-neutral-500">Umumiy davomat</div>
            </div>
          )}

          {/* Кнопки для администратора */}
          {mounted && role === "admin" && (
            <div className="flex items-center gap-2">
              <Link
                href="/davomat/admin"
                className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50"
                title="O‘rnatmalar va boshqaruv"
              >
                <Settings className="h-4 w-4" />
                Admin panel
              </Link>
              <Link
                href="/davomat/admin"
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                title="Yangi dars/seans yaratish"
              >
                <CalendarPlus className="h-4 w-4" />
                Yangi seans
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* ===== Content ===== */}
      {!mounted || !courses || !stats ? (
        <div className="mt-6 space-y-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {courses.map((c) => {
            const st = stats.find((s) => s.courseId === c.id) || {
              courseId: c.id,
              total: 0,
              attended: 0,
            };
            const pct =
              st.total > 0
                ? Math.max(0, Math.min(100, Math.round((st.attended / st.total) * 100)))
                : 0;

            return (
              <div
                key={c.id}
                className="rounded-2xl border border-neutral-200 bg-white p-5"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[16px] font-semibold text-neutral-900">
                      {c.title}
                    </div>
                    <div className="text-[13px] text-neutral-600">
                      O‘qituvchi: {c.teacher}
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-4 text-[12px]">
                      <div>
                        <div className="text-neutral-500">Jami darslar</div>
                        <div className="text-neutral-900 text-[14px]">{st.total}</div>
                      </div>
                      <div>
                        <div className="text-neutral-500">Qatnashgan</div>
                        <div className="text-emerald-600 text-[14px] font-medium">
                          {st.attended}
                        </div>
                      </div>
                      <div className="col-span-3 sm:col-span-1">
                        <div className="text-neutral-500">Davomat foizi</div>
                        <div className="mt-1 h-2 w-full rounded bg-neutral-200">
                          <div
                            className="h-2 rounded bg-amber-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <Link
                    href={`/davomat/${encodeURIComponent(c.id)}`}
                    className="ml-4 inline-flex items-center gap-1 rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50"
                    title="Batafsil"
                  >
                    Batafsil <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---------------- UI bits ---------------- */
function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5">
      <div className="h-4 w-56 rounded bg-neutral-200 animate-pulse" />
      <div className="mt-2 h-3 w-40 rounded bg-neutral-200 animate-pulse" />
      <div className="mt-4 h-2 w-full rounded bg-neutral-200 animate-pulse" />
    </div>
  );
}
