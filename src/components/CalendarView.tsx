"use client";

import { useMemo } from "react";
import type { EventItem } from "@/lib/events";

type View = "day" | "week" | "month";

export default function CalendarView({
  current,
  view,
  events,
  onPrev,
  onNext,
  onToday,
  onView,
}: {
  current: Date;
  view: View;
  events: EventItem[];
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onView: (v: View) => void;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white">
      <CalendarToolbar
        current={current}
        view={view}
        onPrev={onPrev}
        onNext={onNext}
        onToday={onToday}
        onView={onView}
      />
      {view === "month" && <MonthGrid current={current} events={events} />}
      {view === "week" && <WeekGrid current={current} events={events} />}
      {view === "day" && <DayList current={current} events={events} />}
    </div>
  );
}

/* ---------- Toolbar ---------- */
function CalendarToolbar({
  current,
  view,
  onPrev,
  onNext,
  onToday,
  onView,
}: {
  current: Date;
  view: View;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onView: (v: View) => void;
}) {
  const title = current.toLocaleDateString("uz-UZ", {
    year: "numeric",
    month: view === "month" ? "long" : "numeric",
    day: view === "day" ? "numeric" : undefined,
  });

  return (
    <div className="flex items-center justify-between gap-3 border-b p-3">
      <div className="text-[15px] font-semibold capitalize">{title}</div>

      <div className="flex items-center gap-2">
        <div className="rounded-xl border">
          <button onClick={() => onView("day")} className={`px-3 py-1.5 text-sm ${view === "day" ? "bg-neutral-100" : ""}`}>Kun</button>
          <button onClick={() => onView("week")} className={`px-3 py-1.5 text-sm ${view === "week" ? "bg-neutral-100" : ""}`}>Hafta</button>
          <button onClick={() => onView("month")} className={`px-3 py-1.5 text-sm ${view === "month" ? "bg-neutral-100" : ""}`}>Oy</button>
        </div>
        <div className="rounded-xl border">
          <button onClick={onPrev} className="px-3 py-1.5 text-sm">◀︎</button>
          <button onClick={onToday} className="px-3 py-1.5 text-sm">Bugun</button>
          <button onClick={onNext} className="px-3 py-1.5 text-sm">▶︎</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Month ---------- */
function MonthGrid({ current, events }: { current: Date; events: EventItem[] }) {
  const start = startOfMonthGrid(current);
  const cells = Array.from({ length: 42 }, (_, i) => addDays(start, i)); // 6x7

  const byDay = useMemo(() => groupByDay(events), [events]);

  const monthIdx = current.getMonth();

  return (
    <div className="grid grid-cols-7 gap-px bg-neutral-200">
      {["Yak","Dush","Sesh","Chor","Pay","Jum","Shan"].map((d) => (
        <div key={d} className="bg-neutral-50 p-2 text-center text-xs font-medium text-neutral-600">{d}</div>
      ))}
      {cells.map((date) => {
        const key = ymd(date);
        const dayEvents = byDay.get(key) ?? [];
        const isOther = date.getMonth() !== monthIdx;
        return (
          <div key={key} className={`min-h-[110px] bg-white p-2 ${isOther ? "bg-neutral-50 text-neutral-400" : ""}`}>
            <div className="text-xs">{date.getDate()}</div>
            <div className="mt-1 space-y-1">
              {dayEvents.slice(0, 3).map((e) => (
                <a key={e.id} href={`/events/${e.slug}`} className={`block truncate rounded-md px-2 py-0.5 text-xs ${kindColor(e.kind)}`}>
                  {timeHM(e.start)} {e.title}
                </a>
              ))}
              {dayEvents.length > 3 && (
                <div className="truncate rounded-md bg-neutral-100 px-2 py-0.5 text-xs text-neutral-700">+{dayEvents.length - 3} ta</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Week ---------- */
function WeekGrid({ current, events }: { current: Date; events: EventItem[] }) {
  const start = startOfWeek(current);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const byDay = useMemo(() => groupByDay(events), [events]);

  return (
    <div className="grid grid-cols-7 gap-px bg-neutral-200">
      {days.map((d) => {
        const key = ymd(d);
        const items = (byDay.get(key) ?? []).sort((a,b) => +new Date(a.start) - +new Date(b.start));
        return (
          <div key={key} className="min-h-[140px] bg-white p-2">
            <div className="text-xs font-medium">{d.toLocaleDateString("uz-UZ", { weekday: "short", day: "numeric" })}</div>
            <div className="mt-1 space-y-1">
              {items.map((e) => (
                <a key={e.id} href={`/events/${e.slug}`} className={`block truncate rounded-md px-2 py-0.5 text-xs ${kindColor(e.kind)}`}>
                  {timeHM(e.start)}–{timeHM(e.end)} {e.title}
                </a>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Day ---------- */
function DayList({ current, events }: { current: Date; events: EventItem[] }) {
  const key = ymd(current);
  const items = (groupByDay(events).get(key) ?? []).sort((a,b) => +new Date(a.start) - +new Date(b.start));
  return (
    <div className="p-3">
      {items.length === 0 ? (
        <div className="text-sm text-neutral-600">Bu kunda tadbirlar yo‘q.</div>
      ) : (
        <div className="space-y-2">
          {items.map((e) => (
            <a key={e.id} href={`/events/${e.slug}`} className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm hover:bg-neutral-50 ${kindBorder(e.kind)}`}>
              <div className="truncate">{e.title}</div>
              <div className="text-neutral-600">{timeHM(e.start)}–{timeHM(e.end)}</div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- utils ---------- */
function startOfMonthGrid(d: Date) {
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7; // make Monday=0, Sunday=6
  return addDays(first, -offset);
}
function startOfWeek(d: Date) {
  const offset = (d.getDay() + 6) % 7;
  return addDays(new Date(d), -offset);
}
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function ymd(d: Date) { return d.toISOString().slice(0,10); }
function timeHM(iso: string) { const dt = new Date(iso); return dt.toLocaleTimeString("uz-UZ",{hour:"2-digit",minute:"2-digit",hour12:false}); }

function kindColor(kind: EventItem["kind"]) {
  if (kind === "Takvim") return "bg-amber-100 text-amber-800";
  if (kind === "Seminar") return "bg-violet-100 text-violet-800";
  return "bg-rose-100 text-rose-800";
}
function kindBorder(kind: EventItem["kind"]) {
  if (kind === "Takvim") return "border-amber-200";
  if (kind === "Seminar") return "border-violet-200";
  return "border-rose-200";
}
function groupByDay(list: EventItem[]) {
  const m = new Map<string, EventItem[]>();
  list.forEach((e) => {
    const d = new Date(e.start);
    const key = d.toISOString().slice(0,10);
    if (!m.has(key)) m.set(key, []);
    m.get(key)!.push(e);
  });
  return m;
}
