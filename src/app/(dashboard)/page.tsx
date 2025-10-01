"use client";

import { useEffect, useState } from "react";
import { ChevronRight, FileText } from "lucide-react";
import { getUser } from "@/lib/user";
import {
  getCompletedTestsCount,
  getUserProgressPercent,   // средний % по завершённым
  getAttendancePercent,     // доля завершённых от всех активных
  ATTEMPTS_CHANGED,
  TESTS_CHANGED,
  PROGRESS_CHANGED,
} from "@/lib/tests";
import { getEvents, EVENTS_CHANGED, type EventItem } from "@/lib/events";

/** Как считать Davomat:
 *  true  -> средний % по завершённым тестам
 *  false -> доля завершённых от всех активных тестов
 */
const USE_AVERAGE_AS_DAVOMAT = true;

/* демо-активности для блока "So'ngi faoliyatlar" */
type ActivityItem = { id: string; title: string; note: string; timeAgo: string };
const seedActivities: ActivityItem[] = [
  { id: "a1", title: "Konstitutsiya huquqi testi", note: "tugatildi", timeAgo: "2 soat oldin" },
  { id: "a2", title: "Yuridik klub", note: "uchrashuvida qatnashding", timeAgo: "1 kun oldin" },
  { id: "a3", title: "Huquq asoslari", note: "kitobini o'qishni boshladingiz", timeAgo: "3 kun oldin" },
];

export default function DashboardPage() {
  // живые цифры
  const [completed, setCompleted] = useState(0);
  const [davomat, setDavomat] = useState(0);

  // активности и ближайшие события
  const [activities, setActivities] = useState<ActivityItem[] | null>(null);
  const [events, setEvents] = useState<EventItem[] | null>(null);

  /* ===== статистика тестов ===== */
  useEffect(() => {
    const u = getUser();
    const uid = u.name || "current";

    const loadStats = () => {
      setCompleted(getCompletedTestsCount(uid));
      setDavomat(
        USE_AVERAGE_AS_DAVOMAT ? getUserProgressPercent(uid) : getAttendancePercent(uid)
      );
    };

    loadStats();

    const onChange = () => loadStats();
    window.addEventListener(ATTEMPTS_CHANGED, onChange);
    window.addEventListener(PROGRESS_CHANGED, onChange);
    window.addEventListener(TESTS_CHANGED, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(ATTEMPTS_CHANGED, onChange);
      window.removeEventListener(PROGRESS_CHANGED, onChange);
      window.removeEventListener(TESTS_CHANGED, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  /* ===== активности + события ===== */
  useEffect(() => {
    setActivities(seedActivities);

    const loadEv = () => {
      const now = Date.now();
      const list = getEvents()
        .filter((e) => new Date(e.end || e.start).getTime() >= now)
        .sort((a, b) => +new Date(a.start) - +new Date(b.start))
        .slice(0, 3);
      setEvents(list);
    };

    loadEv();
    const onEv = () => loadEv();
    window.addEventListener(EVENTS_CHANGED, onEv);
    window.addEventListener("storage", onEv);
    return () => {
      window.removeEventListener(EVENTS_CHANGED, onEv);
      window.removeEventListener("storage", onEv);
    };
  }, []);

  return (
    <>
      {/* Статкарточки как в макете — ТОЛЬКО живые значения */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <StatCard color="emerald" value={`${completed}`} title="Tugallangan testlar" />
        <StatCard
          color="orange"
          value={`${davomat}%`}
          title={USE_AVERAGE_AS_DAVOMAT ? "Davomat (o‘rtacha %)" : "Davomat (yakunlangan ulushi)"}
        />
      </div>

      {/* So'ngi faoliyatlar */}
      <section className="mt-8">
        <h3 className="text-[20px] font-semibold">So'ngi faoliyatlar</h3>
        <div className="mt-4 rounded-2xl border border-neutral-200 bg-white p-0.5">
          {activities === null ? (
            <>
              <ActivitySkeleton />
              <ActivitySkeleton />
              <ActivitySkeleton />
            </>
          ) : (
            activities.map((a, i) => (
              <div
                key={a.id}
                className={`flex items-center justify-between px-5 py-4 ${
                  i !== activities.length - 1 ? "border-b border-neutral-200/70" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-12 w-12 place-content-center rounded-2xl bg-violet-100 text-violet-700">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-[15px] font-semibold text-neutral-900">{a.title}</div>
                    <div className="text-[13px] text-neutral-500">{a.note}</div>
                  </div>
                </div>
                <div className="text-[12px] text-neutral-500">{a.timeAgo}</div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Yaqinlashayotgan tadbirlar */}
      <section className="mt-10">
        <h3 className="text-[20px] font-semibold">Yaqinlashayotgan tadbirlar</h3>
        <div className="mt-4 space-y-4">
          {events === null ? (
            <>
              <EventSkeleton />
              <EventSkeleton />
              <EventSkeleton />
            </>
          ) : events.length === 0 ? (
            <div className="rounded-2xl border border-neutral-200 bg-white px-5 py-6 text-sm text-neutral-500">
              Tez orada tadbirlar yo‘q.
            </div>
          ) : (
            events.map((e) => (
              <div key={e.id} className="flex items-center justify-between rounded-2xl border border-neutral-200 bg-white px-5 py-4">
                <div>
                  <div className="text-[15px] font-semibold text-neutral-900">{e.title}</div>
                  <div className="text-[12px] text-neutral-500">{formatISO(e.start)} • {e.location}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-xl bg-violet-50 px-3 py-1 text-[12px] font-medium text-violet-700">{e.capacity} kishi</span>
                  <a href={`/events/${encodeURIComponent(e.slug)}`} className="inline-flex items-center gap-1 rounded-xl border border-neutral-300 px-3 py-1.5 text-[13px] hover:bg-neutral-50">
                    Batafsil <ChevronRight className="h-4 w-4" />
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </>
  );
}

/* --------- helpers --------- */
function StatCard(props: { color: "emerald" | "orange"; value: string; title: string }) {
  const map: Record<string, string> = {
    emerald: "bg-[#22C55E]",
    orange: "bg-[#F97316]",
  };
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white">
      <div className="flex items-center gap-4 px-7 py-6">
        <div className={`grid h-12 w-12 place-content-center rounded-2xl text-white font-semibold ${map[props.color]}`}>
          {props.value}
        </div>
        <div className="text-[15px] text-neutral-800">{props.title}</div>
      </div>
    </div>
  );
}

function ActivitySkeleton() {
  return (
    <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200/70 last:border-b-0">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-2xl bg-neutral-200 animate-pulse" />
        <div>
          <div className="h-4 w-48 rounded bg-neutral-200 animate-pulse" />
          <div className="mt-2 h-3 w-24 rounded bg-neutral-200 animate-pulse" />
        </div>
      </div>
      <div className="h-3 w-16 rounded bg-neutral-200 animate-pulse" />
    </div>
  );
}

function EventSkeleton() {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-neutral-200 bg-white px-5 py-4">
      <div>
        <div className="h-4 w-56 rounded bg-neutral-200 animate-pulse" />
        <div className="mt-2 h-3 w-40 rounded bg-neutral-200 animate-pulse" />
      </div>
      <div className="flex items-center gap-3">
        <span className="h-7 w-20 rounded-xl bg-neutral-200 animate-pulse" />
        <span className="h-9 w-24 rounded-xl border border-neutral-300 bg-neutral-50" />
      </div>
    </div>
  );
}

function formatISO(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("uz-UZ", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
