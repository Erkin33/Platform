"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  getEvents, addEvent, updateEvent, removeEvent,
  requestRegistration, unregisterFromEvent, reviewRegistration, acceptInvite,
  isRegistered, spotsLeft, hasInvite, myRegStatus,
  type EventItem, type EventKind, type EventStatus, type RegistrationForm, type Registration
} from "@/lib/events";
import { getUser, type Role } from "@/lib/user";
import { CalendarDays, MapPin, Users, Trash2, Check, Plus, X, Pause } from "lucide-react";

type MainTab = "list" | "calendar";

export default function EventsPage() {
  const [role, setRole] = useState<Role | null>(null);
  const [userId, setUserId] = useState("");
  const [events, setEvents] = useState<EventItem[]>([]);
  const isAdmin = role === "admin";

  useEffect(() => {
    const u = getUser();
    setRole(u.role);
    setUserId(u.name || "current");
    setEvents(getEvents());
    const on = () => setEvents(getEvents());
    window.addEventListener("uniplatform_events_changed", on);
    window.addEventListener("storage", on);
    return () => {
      window.removeEventListener("uniplatform_events_changed", on);
      window.removeEventListener("storage", on);
    };
  }, []);

  const [tab, setTab] = useState<MainTab>("list");
  const sorted = useMemo(
    () => events.slice().sort((a, b) => +new Date(a.start) - +new Date(b.start)),
    [events]
  );

  const [createOpen, setCreateOpen] = useState(false);
  const [createPresetDate, setCreatePresetDate] = useState<string | null>(null);
  const [regOpenFor, setRegOpenFor] = useState<EventItem | null>(null);
  function openCreate(dateISO?: string) { setCreatePresetDate(dateISO ?? null); setCreateOpen(true); }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Tadbirlar</h1>
        <div className="flex items-center gap-2">
          <div className="rounded-xl border">
            <button onClick={() => setTab("list")} className={`px-3 py-1.5 text-sm ${tab === "list" ? "bg-neutral-100" : ""}`}>Ro‘yxat</button>
            <button onClick={() => setTab("calendar")} className={`px-3 py-1.5 text-sm ${tab === "calendar" ? "bg-neutral-100" : ""}`}>Kalendar</button>
          </div>
          {isAdmin && (
            <button onClick={() => openCreate()} className="rounded-xl bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700">
              <Plus className="mr-1 inline h-4 w-4" /> Yangi tadbir
            </button>
          )}
        </div>
      </div>

      {tab === "list" && (
        <div className="space-y-4">
          {sorted.map((ev) => (
            <EventRow
              key={ev.id}
              ev={ev}
              isAdmin={isAdmin}
              userId={userId}
              onEdit={(p) => updateEvent(ev.id, p)}
              onDelete={() => removeEvent(ev.id)}
              onEnroll={() => setRegOpenFor(ev)}
              onCancel={() => unregisterFromEvent(ev.id, userId)}
              onReview={(reg, act) => reviewRegistration(ev.id, reg.id, act)}
              onAcceptInvite={() => { if (acceptInvite(ev.id, userId)) alert("Taklif qabul qilindi!"); else alert("Taklifni qabul qilib bo‘lmadi."); }}
            />
          ))}
          {sorted.length === 0 && <div className="rounded-2xl border bg-white p-6 text-sm text-neutral-500">Hozircha tadbirlar yo‘q.</div>}
        </div>
      )}

      {tab === "calendar" && <CalendarView events={events} isAdmin={isAdmin} onDayClick={(iso) => openCreate(iso)} />}

      {isAdmin && createOpen && (
        <CreateEventModal
          initialDate={createPresetDate ?? undefined}
          onClose={() => setCreateOpen(false)}
          onSave={(data) => { addEvent(data); setCreateOpen(false); setCreatePresetDate(null); }}
        />
      )}

      {regOpenFor && (
        <RegisterModal
          event={regOpenFor}
          userId={userId}
          onClose={() => setRegOpenFor(null)}
          onSubmit={(payload) => {
            try {
              requestRegistration(payload);
              alert("Ariza yuborildi. Admin tasdiqlashini kuting.");
              setRegOpenFor(null);
            } catch (e: unknown) {
              const msg = e instanceof Error ? e.message : "Xatolik.";
              alert(msg);
            }
          }}
        />
      )}
    </div>
  );
}

function EventRow({
  ev, isAdmin, userId, onEdit, onDelete, onEnroll, onCancel, onReview, onAcceptInvite
}: {
  ev: EventItem;
  isAdmin: boolean;
  userId: string;
  onEdit: (patch: Partial<EventItem>) => void;
  onDelete: () => void;
  onEnroll: () => void;
  onCancel: () => void;
  onReview: (reg: Registration, action: "approve" | "reject" | "freeze") => void;
  onAcceptInvite: () => void;
}) {
  const left = spotsLeft(ev);
  const registered = isRegistered(ev, userId);
  const status = myRegStatus(ev, userId);
  const invited = hasInvite(ev, userId);

  const chipColor: Record<EventItem["kind"], string> = {
    Takvim: "bg-amber-100 text-amber-800",
    Seminar: "bg-violet-100 text-violet-800",
    Imtihon: "bg-rose-100 text-rose-800"
  };
  const eventChip = ev.status === "closed" ? "bg-neutral-300 text-white" : ev.status === "waitlist" ? "bg-neutral-200 text-neutral-700" : "bg-emerald-100 text-emerald-800";

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-lg font-semibold">{ev.title}</h3>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${chipColor[ev.kind]}`}>{ev.kind}</span>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${eventChip}`}>
              {ev.status === "closed" ? "Yopiq" : ev.status === "waitlist" ? "Kutish" : "Jamoviy / Individual"}
            </span>
            {registered && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800">Ro‘yxatdan otgan</span>}
          </div>

          <div className="mt-2 space-y-1 text-[13px] text-neutral-700">
            <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-neutral-500" />{fmt(ev.start)} — {fmt(ev.end)}</div>
            <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-neutral-500" />{ev.location}</div>
            <div className="flex items-center gap-2"><Users className="h-4 w-4 text-neutral-500" />{ev.participants.length} / {ev.capacity} ishtirokchi</div>
          </div>

          {ev.description && <p className="mt-3 text-[14px] text-neutral-700">{ev.description}</p>}

          {!isAdmin && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {invited && <button onClick={onAcceptInvite} className="rounded-lg border-emerald-300 bg-emerald-50 px-3 py-1.5 text-sm text-emerald-700">Siz jamoaga taklif qilindingiz — Qabul qilish</button>}
              {status === "pending" && <span className="rounded-lg bg-amber-50 px-3 py-1.5 text-sm text-amber-700">Ariza ko‘rib chiqilmoqda</span>}
              {status === "frozen" && <span className="rounded-lg bg-neutral-100 px-3 py-1.5 text-sm text-neutral-700">Ariza muzlatilgan</span>}
              {status === "rejected" && <span className="rounded-lg bg-rose-50 px-3 py-1.5 text-sm text-rose-700">Arizangiz rad etildi</span>}
              {!registered && ev.status === "open" && left === 0 && (
                <span className="rounded-lg bg-neutral-100 px-3 py-1.5 text-sm text-neutral-700">Joylar tugagan</span>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-2">
          {isAdmin ? (
            <>
              <div className="flex gap-2">
                <button onClick={() => onEdit({ status: "open" })} className={`rounded-lg px-3 py-1.5 text-sm ${ev.status === "open" ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border hover:bg-neutral-50"}`} title="Open"><Check className="mr-1 inline h-4 w-4" />Open</button>
                <button onClick={() => onEdit({ status: "waitlist" })} className={`rounded-lg px-3 py-1.5 text-sm ${ev.status === "waitlist" ? "border-neutral-300 bg-neutral-100 text-neutral-700" : "border hover:bg-neutral-50"}`} title="Kutish"><Pause className="mr-1 inline h-4 w-4" />Kutish</button>
                <button onClick={() => onEdit({ status: "closed" })} className={`rounded-lg px-3 py-1.5 text-sm ${ev.status === "closed" ? "border-neutral-300 bg-neutral-100 text-neutral-700" : "border hover:bg-neutral-50"}`} title="Yopiq"><X className="mr-1 inline h-4 w-4" />Yopiq</button>
              </div>

              {ev.registrations.some((r) => r.status === "pending" || r.status === "frozen") && (
                <div className="mt-2 w-full rounded-xl border p-3">
                  <div className="mb-2 text-sm font-medium">Arizalar</div>
                  <div className="space-y-2">
                    {ev.registrations.filter((r) => r.status === "pending" || r.status === "frozen").map((r) => (
                      <div key={r.id} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm">
                        <div className="min-w-0">
                          <div className="truncate font-medium">{r.form.fullName} {r.mode === "team" && <span className="ml-2 rounded bg-neutral-100 px-2 py-0.5 text-[11px]">Team</span>}</div>
                          <div className="text-neutral-600">{r.form.phone} • {r.form.email}</div>
                          {r.form.group && <div className="text-neutral-600">Guruh: {r.form.group}</div>}
                          {r.form.note && <div className="text-neutral-600">Izoh: {r.form.note}</div>}
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <button onClick={() => onReview(r, "approve")} className="rounded-lg border-emerald-300 bg-emerald-50 px-3 py-1.5 text-emerald-700">Qabul</button>
                          <button onClick={() => onReview(r, "freeze")} className="rounded-lg border-neutral-300 bg-neutral-100 px-3 py-1.5 text-neutral-700">Muzlatish</button>
                          <button onClick={() => onReview(r, "reject")} className="rounded-lg border-rose-300 bg-rose-50 px-3 py-1.5 text-rose-700">Rad etish</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Link href={`/events/${ev.slug}`} className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm hover:bg-neutral-50">Batafsil</Link>
                <button onClick={onDelete} className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm hover:bg-neutral-50"><Trash2 className="h-4 w-4" />O‘chirish</button>
              </div>
            </>
          ) : (
            <>
              <Link href={`/events/${ev.slug}`} className="inline-block rounded-lg border px-4 py-2 text-sm hover:bg-neutral-50">Batafsil</Link>
              {registered ? (
                <button onClick={onCancel} className="rounded-lg border border-rose-300 bg-white px-4 py-2 text-sm text-rose-600 hover:bg-rose-50">Bekor qilish</button>
              ) : (
                ev.status === "open" && left > 0 && (
                  <button onClick={onEnroll} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Ro‘yxatdan o‘tish</button>
                )
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function CalendarView({ events, isAdmin, onDayClick }: { events: EventItem[]; isAdmin: boolean; onDayClick: (iso: string) => void; }) {
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); d.setHours(0,0,0,0); return d; });
  const monthLabel = cursor.toLocaleString("uz-UZ", { month: "long", year: "numeric" });
  const startWeekIdx = (() => { const d = new Date(cursor); const day = d.getDay(); return (day + 6) % 7; })();
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const grid: Date[] = [];
  for (let i = 0; i < startWeekIdx; i++) { const d = new Date(cursor); d.setDate(-i); grid.unshift(d); }
  for (let i = 1; i <= daysInMonth; i++) { const d = new Date(cursor); d.setDate(i); grid.push(d); }
  while (grid.length % 7 !== 0 || grid.length < 42) { const last = grid[grid.length - 1]; const d = new Date(last); d.setDate(d.getDate() + 1); grid.push(d); }

  const eventsByDay = new Map<string, EventItem[]>();
  for (const ev of events) {
    const key = new Date(ev.start).toISOString().slice(0, 10);
    if (!eventsByDay.has(key)) eventsByDay.set(key, []);
    eventsByDay.get(key)!.push(ev);
  }
  function isoFor(d: Date) { const dayISO = d.toISOString().slice(0, 10); return `${dayISO}T10:00`; }

  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-lg font-semibold capitalize">{monthLabel}</div>
        <div className="flex gap-2">
          <button className="rounded-lg border px-3 py-1.5 hover:bg-neutral-50" onClick={() => { const d = new Date(cursor); d.setMonth(d.getMonth() - 1); setCursor(d); }}>←</button>
          <button className="rounded-lg border px-3 py-1.5 hover:bg-neutral-50" onClick={() => { const d = new Date(); d.setDate(1); d.setHours(0,0,0,0); setCursor(d); }}>Bugun</button>
          <button className="rounded-lg border px-3 py-1.5 hover:bg-neutral-50" onClick={() => { const d = new Date(cursor); d.setMonth(d.getMonth() + 1); setCursor(d); }}>→</button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px rounded-xl border bg-neutral-200">
        {["Yak","Dush","Sesh","Chor","Pay","Jum","Shan"].map((w) => (
          <div key={w} className="bg-white px-2 py-1 text-center text-xs font-medium text-neutral-500">{w}</div>
        ))}
        {grid.map((d, i) => {
          const inMonth = d.getMonth() === cursor.getMonth();
          const key = d.toISOString().slice(0, 10);
          const dayEvents = (eventsByDay.get(key) || []).sort((a, b) => +new Date(a.start) - +new Date(b.start));
          return (
            <div key={i} className={`min-h-[104px] cursor-${isAdmin ? "pointer" : "default"} bg-white p-2 ${inMonth ? "" : "bg-neutral-50 text-neutral-400"}`} onClick={() => { if (!isAdmin) return; onDayClick(isoFor(d)); }}>
              <div className="mb-1 text-right text-xs">{d.getDate()}</div>
              <div className="space-y-1">
                {dayEvents.map((ev) => (
                  <Link key={ev.id} href={`/events/${ev.slug}`} className={`block truncate rounded px-2 py-0.5 text-[11px] ${ev.status === "closed" ? "bg-neutral-200 text-neutral-700" : ev.status === "waitlist" ? "bg-neutral-100 text-neutral-700" : "bg-emerald-100 text-emerald-800"}`} title={ev.title} onClick={(e) => e.stopPropagation()}>
                    {ev.title}
                  </Link>
                ))}
                {isAdmin && (
                  <button className="mt-1 w-full rounded border px-1 py-0.5 text-[11px] hover:bg-neutral-50" onClick={(e) => { e.stopPropagation(); onDayClick(isoFor(d)); }}>
                    + Yangi
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {isAdmin && <p className="mt-2 text-xs text-neutral-500">* Admin kunni bossa — yaratish oynasi ochiladi.</p>}
    </div>
  );
}

function CreateEventModal({
  onClose, onSave, initialDate
}: {
  onClose: () => void;
  onSave: (data: Omit<EventItem, "id" | "slug" | "participants" | "registrations" | "teams" | "createdAt">) => void;
  initialDate?: string;
}) {
  const presetDate = initialDate ? initialDate.slice(0, 10) : new Date().toISOString().slice(0, 10);
  const presetTime = initialDate ? initialDate.slice(11, 16) : "10:00";
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<EventKind>("Seminar");
  const [date, setDate] = useState(presetDate);
  const [time, setTime] = useState(presetTime);
  const [durationMin, setDurationMin] = useState(120);
  const [location, setLocation] = useState("");
  const [capacity, setCapacity] = useState(30);
  const [status, setStatus] = useState<EventStatus>("open");
  const [description, setDescription] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const start = `${date}T${time}`;
    const end = new Date(start); end.setMinutes(end.getMinutes() + durationMin);
    onSave({ title, kind, start, end: end.toISOString(), location, capacity, status, description, details: {} });
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/20 p-4">
      <form onSubmit={submit} className="w-full max-w-md space-y-3 rounded-2xl border bg-white p-4">
        <div className="text-lg font-semibold">Yangi tadbir qo‘shish</div>
        <input className="w-full rounded-xl border px-3 py-2" placeholder="Tadbir nomi" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <div className="grid grid-cols-2 gap-2">
          <input type="date" className="rounded-xl border px-3 py-2" value={date} onChange={(e) => setDate(e.target.value)} required />
          <input type="time" className="rounded-xl border px-3 py-2" value={time} onChange={(e) => setTime(e.target.value)} required />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <select className="rounded-xl border px-3 py-2" value={kind} onChange={(e) => setKind(e.target.value as EventKind)}>
            <option value="Seminar">Seminar</option>
            <option value="Takvim">Tanlov</option>
            <option value="Imtihon">Imtihon</option>
          </select>
          <input type="number" min={15} step={15} className="rounded-xl border px-3 py-2" value={durationMin} onChange={(e) => setDurationMin(+e.target.value)} placeholder="Davomiyligi, min" />
        </div>
        <input className="w-full rounded-xl border px-3 py-2" placeholder="Joy (masalan, 201-xona)" value={location} onChange={(e) => setLocation(e.target.value)} required />
        <div className="grid grid-cols-2 gap-2">
          <input type="number" min={1} className="rounded-xl border px-3 py-2" placeholder="Sig‘im" value={capacity} onChange={(e) => setCapacity(+e.target.value)} />
          <select className="rounded-xl border px-3 py-2" value={status} onChange={(e) => setStatus(e.target.value as EventStatus)}>
            <option value="open">Open</option>
            <option value="waitlist">Kutish</option>
            <option value="closed">Yopiq</option>
          </select>
        </div>
        <textarea className="w-full rounded-xl border px-3 py-2" rows={3} placeholder="Tadbir haqida qisqa ma'lumot" value={description} onChange={(e) => setDescription(e.target.value)} />
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-xl border px-4 py-2">Bekor qilish</button>
          <button className="rounded-xl bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700">Saqlash</button>
        </div>
      </form>
    </div>
  );
}

function RegisterModal({
  event, userId, onClose, onSubmit
}: {
  event: EventItem;
  userId: string;
  onClose: () => void;
  onSubmit: (p: { eventId: string; userId: string; mode: "individual" | "team"; form: RegistrationForm; teamName?: string; inviteUserIds?: string[]; }) => void;
}) {
  const [mode, setMode] = useState<"individual" | "team">("individual");
  const [form, setForm] = useState<RegistrationForm>({ fullName: getUser().name || "", phone: "", email: "", faculty: "", course: "", group: "", note: "" });
  const [teamName, setTeamName] = useState("Jamoa");
  const [invites, setInvites] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      eventId: event.id, userId, mode, form,
      teamName: mode === "team" ? teamName : undefined,
      inviteUserIds: mode === "team" ? invites.split(",").map((s) => s.trim()).filter(Boolean) : undefined
    });
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/20 p-4">
      <form onSubmit={submit} className="w-full max-w-lg space-y-3 rounded-2xl border bg-white p-4">
        <div className="text-lg font-semibold">Tadbirga ro‘yxatdan o‘tish</div>
        <div className="rounded-lg bg-neutral-50 p-3 text-[13px]">
          <div className="font-medium">{event.title}</div>
          <div className="mt-1 text-neutral-700">{fmt(event.start)} • {event.location}</div>
          <div className="mt-1 text-neutral-700">{event.description}</div>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setMode("individual")} className={`rounded-xl border px-3 py-1.5 text-sm ${mode === "individual" ? "bg-neutral-100" : ""}`}>Individual</button>
          <button type="button" onClick={() => setMode("team")} className={`rounded-xl border px-3 py-1.5 text-sm ${mode === "team" ? "bg-neutral-100" : ""}`}>Jamoa</button>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <input className="rounded-xl border px-3 py-2" placeholder="Ism familiya" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
          <input className="rounded-xl border px-3 py-2" placeholder="+998 ..." value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
          <input className="rounded-xl border px-3 py-2 sm:col-span-2" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <input className="rounded-xl border px-3 py-2" placeholder="Fakultet" value={form.faculty} onChange={(e) => setForm({ ...form, faculty: e.target.value })} required />
          <input className="rounded-xl border px-3 py-2" placeholder="Kurs" value={form.course} onChange={(e) => setForm({ ...form, course: e.target.value })} required />
          <input className="rounded-xl border px-3 py-2 sm:col-span-2" placeholder="Guruh (ixtiyoriy)" value={form.group} onChange={(e) => setForm({ ...form, group: e.target.value })} />
          <textarea className="rounded-xl border px-3 py-2 sm:col-span-2" rows={3} placeholder="Qo‘shimcha izoh (ixtiyoriy)" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        </div>
        {mode === "team" && (
          <div className="rounded-xl border p-3">
            <div className="mb-2 text-sm font-medium">Jamoa</div>
            <input className="mb-2 w-full rounded-xl border px-3 py-2" placeholder="Jamoa nomi" value={teamName} onChange={(e) => setTeamName(e.target.value)} />
            <input className="w-full rounded-xl border px-3 py-2" placeholder="Taklif qilinadigan a'zolar (userId), vergul orqali" value={invites} onChange={(e) => setInvites(e.target.value)} />
            <p className="mt-1 text-xs text-neutral-500">Taklif qilingan ishtirokchi boshqa jamoaga qo‘shila olmaydi.</p>
          </div>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="rounded-xl border px-4 py-2">Bekor qilish</button>
          <button className="rounded-xl bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700">Ro‘yxatdan o‘tish</button>
        </div>
      </form>
    </div>
  );
}

function fmt(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("uz-UZ", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
}
