// src/app/events/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getEvents,
  addEvent,
  updateEvent,
  removeEvent,
  registerToEvent,
  unregisterFromEvent,
  spotsLeft,
  isRegistered,
  type EventItem,
  type EventKind,
  type EventStatus,
} from "@/lib/events";
import { getUser, USER_CHANGED, addNotification, type Role } from "@/lib/user";
import {
  CalendarDays,
  MapPin,
  Users,
  PencilLine,
  Trash2,
  Check,
  Plus,
} from "lucide-react";
import CalendarView from "@/components/CalendarView";

/* ---- форма ---- */
type FormState = {
  title: string;
  kind: EventKind;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  location: string;
  capacity: number;
  description: string;
  status: EventStatus;
};

const DEFAULT_FORM: FormState = {
  title: "",
  kind: "Takvim",
  startDate: "",
  startTime: "",
  endDate: "",
  endTime: "",
  location: "",
  capacity: 10,
  description: "",
  status: "open",
};

type MainTab = "list" | "calendar";
type CalView = "day" | "week" | "month";

export default function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);

  // роль + юзер
  const [role, setRole] = useState<Role | null>(null);
  const [userId, setUserId] = useState<string>("");

  const isAdmin = role === "admin";

  const load = () => setEvents(getEvents());

  useEffect(() => {
    load();
    const u = getUser();
    setRole(u.role);
    setUserId(u.name || "current");

    const onRole = () => {
      const nu = getUser();
      setRole(nu.role);
      if (nu.role !== "admin") {
        setEditingId(null);
        setForm(DEFAULT_FORM);
      }
    };
    window.addEventListener(USER_CHANGED, onRole);
    const onStorage = (e: StorageEvent) => {
      if (e.key === "uniplatform_user") onRole();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(USER_CHANGED, onRole);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  /* ---- tabs / calendar state ---- */
  const [tab, setTab] = useState<MainTab>("list");
  const [view, setView] = useState<CalView>("month");
  const [cursor, setCursor] = useState<Date>(new Date());

  // события для текущего окна календаря (фильтруем ЛОКАЛЬНЫЙ список — варнинга больше нет)
  const calEvents = useMemo(() => {
    const { start, end } = rangeFor(cursor, view);
    const t0 = start.getTime();
    const t1 = end.getTime();
    return events.filter((ev) => {
      const s = new Date(ev.start).getTime();
      return s >= t0 && s <= t1;
    });
  }, [cursor, view, events]);

  /* ---- CRUD ---- */
  function toISO(date: string, time: string) {
    if (!date) return "";
    const t = time || "00:00";
    return `${date}T${t}`;
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin) return;
    const start = toISO(form.startDate, form.startTime);
    const end = toISO(form.endDate || form.startDate, form.endTime || form.startTime);

    if (editingId) {
      updateEvent(editingId, {
        title: form.title,
        kind: form.kind,
        start,
        end,
        location: form.location,
        capacity: form.capacity,
        description: form.description,
        status: form.status,
      });
      addNotification({
        title: `Tadbir yangilandi: ${form.title}`,
        subtitle: `${form.startDate} ${form.startTime} • ${form.location}`,
      });
      setEditingId(null);
    } else {
      addEvent({
        title: form.title,
        kind: form.kind,
        start,
        end,
        location: form.location,
        capacity: form.capacity,
        description: form.description,
        status: form.status,
      });
      addNotification({
        title: `Yangi tadbir: ${form.title}`,
        subtitle: `${form.startDate} ${form.startTime} • ${form.location}`,
      });
    }
    setForm(DEFAULT_FORM);
    load();
  }

  function startEdit(ev: EventItem) {
    if (!isAdmin) return;
    const s = new Date(ev.start);
    const e = new Date(ev.end);
    setEditingId(ev.id);
    setForm({
      title: ev.title,
      kind: ev.kind,
      startDate: s.toISOString().slice(0, 10),
      startTime: s.toTimeString().slice(0, 5),
      endDate: e.toISOString().slice(0, 10),
      endTime: e.toTimeString().slice(0, 5),
      location: ev.location,
      capacity: ev.capacity,
      description: ev.description ?? "",
      status: ev.status,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(DEFAULT_FORM);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Tadbirlar</h1>

        <div className="rounded-xl border">
          <button
            onClick={() => setTab("list")}
            className={`px-3 py-1.5 text-sm ${tab === "list" ? "bg-neutral-100" : ""}`}
          >
            Ro‘yxat
          </button>
          <button
            onClick={() => setTab("calendar")}
            className={`px-3 py-1.5 text-sm ${tab === "calendar" ? "bg-neutral-100" : ""}`}
          >
            Kalendar
          </button>
        </div>
      </div>

      {/* Форма (только Admin) */}
      {role === "admin" && tab === "list" && (
        <form
          onSubmit={submit}
          className="grid gap-3 rounded-2xl border border-neutral-200 bg-white p-4"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              className="rounded-xl border px-3 py-2"
              placeholder="Sarlavha"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
            <select
              className="rounded-xl border px-3 py-2"
              value={form.kind}
              onChange={(e) => setForm({ ...form, kind: e.target.value as EventKind })}
            >
              <option value="Takvim">Takvim</option>
              <option value="Seminar">Seminar</option>
              <option value="Imtihon">Imtihon</option>
            </select>

            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                className="rounded-xl border px-3 py-2"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                required
              />
              <input
                type="time"
                className="rounded-xl border px-3 py-2"
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                className="rounded-xl border px-3 py-2"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              />
              <input
                type="time"
                className="rounded-xl border px-3 py-2"
                value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
              />
            </div>

            <input
              className="rounded-xl border px-3 py-2"
              placeholder="Joy (masalan, 201-xona)"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              required
            />
            <input
              type="number"
              min={1}
              className="rounded-xl border px-3 py-2"
              placeholder="Sig'im"
              value={form.capacity}
              onChange={(e) =>
                setForm({ ...form, capacity: Number(e.target.value) })
              }
            />
            <select
              className="rounded-xl border px-3 py-2"
              value={form.status}
              onChange={(e) =>
                setForm({ ...form, status: e.target.value as EventStatus })
              }
            >
              <option value="open">Open</option>
              <option value="waitlist">Kutish</option>
              <option value="closed">Yopiq</option>
            </select>
          </div>

          <textarea
            className="rounded-xl border px-3 py-2"
            placeholder="Tavsif"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />

          <div className="flex items-center justify-end gap-3">
            {editingId && (
              <button
                type="button"
                onClick={cancelEdit}
                className="rounded-xl border px-4 py-2"
              >
                Bekor qilish
              </button>
            )}
            <button className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700">
              <Plus className="h-4 w-4" /> {editingId ? "Saqlash" : "Yangi tadbir"}
            </button>
          </div>
        </form>
      )}

      {/* Tab: Ro'yxat */}
      {tab === "list" && (
        <div className="space-y-4">
          {events.map((ev) => (
            <EventRow
              key={ev.id}
              ev={ev}
              isAdmin={isAdmin}
              userId={userId}
              onEdit={() => startEdit(ev)}
              onDelete={() => {
                if (isAdmin) {
                  removeEvent(ev.id);
                  addNotification({ title: `Tadbir o‘chirildi: ${ev.title}` });
                  load();
                }
              }}
              onEnroll={() => {
                registerToEvent(ev.id, userId);
                addNotification({ title: "Ro‘yxatdan o‘tildi", subtitle: ev.title });
                load();
              }}
              onCancel={() => {
                unregisterFromEvent(ev.id, userId);
                addNotification({ title: "Ro‘yxatdan bekor qilindi", subtitle: ev.title });
                load();
              }}
            />
          ))}
        </div>
      )}

      {/* Tab: Kalendar */}
      {tab === "calendar" && (
        <CalendarView
          current={cursor}
          view={view}
          events={calEvents}
          onPrev={() => setCursor(prevFor(view, cursor))}
          onNext={() => setCursor(nextFor(view, cursor))}
          onToday={() => setCursor(new Date())}
          onView={setView}
        />
      )}
    </div>
  );
}

/* ---------- Row ---------- */
function EventRow({
  ev,
  isAdmin,
  userId,
  onEdit,
  onDelete,
  onEnroll,
  onCancel,
}: {
  ev: EventItem;
  isAdmin: boolean;
  userId: string;
  onEdit: () => void;
  onDelete: () => void;
  onEnroll: () => void;
  onCancel: () => void;
}) {
  const left = spotsLeft(ev);
  const registered = isRegistered(ev, userId);
  const chipColor: Record<EventItem["kind"], string> = {
    Takvim: "bg-amber-100 text-amber-800",
    Seminar: "bg-violet-100 text-violet-800",
    Imtihon: "bg-rose-100 text-rose-800",
  };
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-lg font-semibold">{ev.title}</h3>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${chipColor[ev.kind]}`}
            >
              {ev.kind}
            </span>
          </div>
          <div className="mt-2 space-y-1 text-[13px] text-neutral-700">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-neutral-500" />
              {fmt(ev.start)} — {fmt(ev.end)}
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-neutral-500" />
              {ev.location}
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-neutral-500" />
              {ev.participants.length} / {ev.capacity} ishtirokchi
            </div>
          </div>
          {ev.description && (
            <p className="mt-3 text-[14px] text-neutral-700">{ev.description}</p>
          )}
        </div>

        <div className="flex flex-col items-end gap-2">
          {isAdmin ? (
            <>
              <div className="flex gap-2">
                <button
                  onClick={onEdit}
                  className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm hover:bg-neutral-50"
                >
                  <PencilLine className="h-4 w-4" /> Tahrirlash
                </button>
                <button
                  onClick={onDelete}
                  className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm hover:bg-neutral-50"
                >
                  <Trash2 className="h-4 w-4" /> O‘chirish
                </button>
              </div>
              <div className="flex gap-2">
                <QuickStatus ev={ev} status="open" label="Open" />
                <QuickStatus ev={ev} status="waitlist" label="Kutish" />
                <QuickStatus ev={ev} status="closed" label="Yopiq" />
              </div>
            </>
          ) : (
            <>
              {ev.status === "closed" && (
                <span className="inline-block rounded-lg bg-neutral-300 px-4 py-2 text-sm text-white">
                  Yopiq
                </span>
              )}
              {ev.status === "waitlist" && (
                <span className="inline-block rounded-lg bg-neutral-400 px-4 py-2 text-sm text-white">
                  Kutish
                </span>
              )}
              {registered && (
                <span className="inline-block rounded-lg bg-emerald-100 px-4 py-2 text-sm text-emerald-700">
                  ✓ Ro‘yxatdan o‘tgan
                </span>
              )}
              {!registered && ev.status === "open" && left > 0 && (
                <button
                  onClick={onEnroll}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Ro‘yxatdan o‘tish
                </button>
              )}
              {registered && (
                <button
                  onClick={onCancel}
                  className="rounded-lg border border-rose-300 bg-white px-4 py-2 text-sm text-rose-600 hover:bg-rose-50"
                >
                  Bekor qilish
                </button>
              )}
            </>
          )}
          <a
            href={`/events/${ev.slug}`}
            className="inline-block rounded-lg border px-4 py-2 text-sm hover:bg-neutral-50"
          >
            Batafsil
          </a>
        </div>
      </div>
    </div>
  );
}

function QuickStatus({
  ev,
  status,
  label,
}: {
  ev: EventItem;
  status: EventStatus;
  label: string;
}) {
  const active = ev.status === status;
  return (
    <button
      onClick={() => updateEvent(ev.id, { status })}
      className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm ${
        active
          ? "border-emerald-300 bg-emerald-50 text-emerald-700"
          : "border bg-white hover:bg-neutral-50"
      }`}
      title={label}
    >
      {active && <Check className="h-4 w-4" />}
      {label}
    </button>
  );
}

/* fmt helpers */
function fmt(iso: string) {
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

/* calendar nav helpers */
function rangeFor(base: Date, view: CalView) {
  if (view === "day") {
    const start = new Date(base);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    end.setMilliseconds(-1);
    return { start, end };
  }
  if (view === "week") {
    const start = new Date(base);
    const offset = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - offset);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    end.setMilliseconds(-1);
    return { start, end };
  }
  const start = new Date(base.getFullYear(), base.getMonth(), 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(base.getFullYear(), base.getMonth() + 1, 1);
  end.setMilliseconds(-1);
  return { start, end };
}
function prevFor(view: CalView, d: Date) {
  const x = new Date(d);
  if (view === "day") x.setDate(x.getDate() - 1);
  if (view === "week") x.setDate(x.getDate() - 7);
  if (view === "month") x.setMonth(x.getMonth() - 1);
  return x;
}
function nextFor(view: CalView, d: Date) {
  const x = new Date(d);
  if (view === "day") x.setDate(x.getDate() + 1);
  if (view === "week") x.setDate(x.getDate() + 7);
  if (view === "month") x.setMonth(x.getMonth() + 1);
  return x;
}
