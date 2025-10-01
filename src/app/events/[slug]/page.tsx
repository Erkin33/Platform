// app/events/[slug]/page.tsx
"use client";

import { use, useEffect, useState } from "react";
import {
  getEventBySlug,
  updateEventBySlug,
  registerToEvent,
  unregisterFromEvent,
  isRegistered,
  spotsLeft,
  type EventDetails,
  type EventItem,
} from "@/lib/events";
import { getUser, type Role } from "@/lib/user";
import { CalendarDays, MapPin, Users, Save, PencilLine } from "lucide-react";

/** Next.js 15: params — Promise. Разворачиваем через React.use() */
export default function EventDetailsPage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = use(props.params);

  const [role, setRole] = useState<Role | null>(null);
  const [userId, setUserId] = useState<string>("");
  const [event, setEvent] = useState<EventItem | null>(null);
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState<EventDetails>({
    about: "",
    agenda: "",
    speakers: "",
    materials: "",
  });

  useEffect(() => {
    const u = getUser();
    setRole(u.role);
    setUserId(u.name || "current");
  }, []);

  useEffect(() => {
    const ev = getEventBySlug(slug) || null;
    setEvent(ev);
    if (ev?.details) setForm(ev.details);
  }, [slug]);

  if (!event) return <div className="text-neutral-600">Topilmadi (event not found).</div>;

  const left = spotsLeft(event);
  const registered = userId ? isRegistered(event, userId) : false;
  const isAdmin = role === "admin";

  function saveDetails(e: React.FormEvent) {
    e.preventDefault();
    updateEventBySlug(slug, { details: form });
    setEvent(getEventBySlug(slug) || null);
    setEdit(false);
  }

  return (
    <div className="max-w-3xl space-y-5">
      <header>
        <h1 className="text-2xl font-semibold">{event.title}</h1>

        <div className="mt-2 grid grid-cols-1 gap-2 text-[13px] text-neutral-700 sm:grid-cols-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-neutral-500" />
            {formatRange(event.start, event.end)}
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-neutral-500" />
            {event.location}
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-neutral-500" />
            {event.participants.length} / {event.capacity} ishtirokchi
          </div>
        </div>
      </header>

      {/* Панель для студента: записаться/отменить */}
      {role === "student" && (
        <div className="flex items-center gap-3">
          {!registered && event.status === "open" && left > 0 && (
            <button
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              onClick={() => {
                registerToEvent(event.id, userId);
                setEvent(getEventBySlug(slug) || null);
              }}
            >
              Ro‘yxatdan o‘tish
            </button>
          )}
          {registered && (
            <button
              className="rounded-lg border border-rose-300 bg-white px-4 py-2 text-sm text-rose-600 hover:bg-rose-50"
              onClick={() => {
                unregisterFromEvent(event.id, userId);
                setEvent(getEventBySlug(slug) || null);
              }}
            >
              Bekor qilish
            </button>
          )}
        </div>
      )}

      {/* ========= READ-ONLY блоки ========= */}
      {!isAdmin || !edit ? (
        <section className="space-y-6 rounded-2xl border border-neutral-200 bg-white p-5">
          {event.description && (
            <div>
              <h3 className="text-[15px] font-semibold">Qisqacha</h3>
              <p className="mt-1 text-[14px] text-neutral-700">{event.description}</p>
            </div>
          )}
          {event.details?.about && (
            <div>
              <h3 className="text-[15px] font-semibold">About</h3>
              <p className="mt-1 whitespace-pre-wrap text-[14px] text-neutral-700">
                {event.details.about}
              </p>
            </div>
          )}
          {event.details?.agenda && (
            <div>
              <h3 className="text-[15px] font-semibold">Agenda</h3>
              <p className="mt-1 whitespace-pre-wrap text-[14px] text-neutral-700">
                {event.details.agenda}
              </p>
            </div>
          )}
          {event.details?.speakers && (
            <div>
              <h3 className="text-[15px] font-semibold">Speakers</h3>
              <p className="mt-1 whitespace-pre-wrap text-[14px] text-neutral-700">
                {event.details.speakers}
              </p>
            </div>
          )}
          {event.details?.materials && (
            <div>
              <h3 className="text-[15px] font-semibold">Materials</h3>
              <p className="mt-1 break-words text-[14px] text-neutral-700">
                {event.details.materials}
              </p>
            </div>
          )}

          {isAdmin && (
            <div className="pt-2">
              <button
                onClick={() => setEdit(true)}
                className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm hover:bg-neutral-50"
              >
                <PencilLine className="h-4 w-4" /> Tahrirlash
              </button>
            </div>
          )}
        </section>
      ) : null}

      {/* ========= ФОРМА ДЛЯ ADMIN ========= */}
      {isAdmin && edit && (
        <form onSubmit={saveDetails} className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-5">
          <div>
            <label className="mb-1 block text-sm font-medium">About</label>
            <textarea
              className="w-full rounded-xl border px-3 py-2"
              rows={4}
              value={form.about ?? ""}
              onChange={(e) => setForm((s) => ({ ...s, about: e.target.value }))}
              placeholder="Kengaytirilgan tavsif..."
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Agenda</label>
            <textarea
              className="w-full rounded-xl border px-3 py-2"
              rows={3}
              value={form.agenda ?? ""}
              onChange={(e) => setForm((s) => ({ ...s, agenda: e.target.value }))}
              placeholder="Kundalik tartib va vaqtlar..."
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Speakers</label>
            <textarea
              className="w-full rounded-xl border px-3 py-2"
              rows={2}
              value={form.speakers ?? ""}
              onChange={(e) => setForm((s) => ({ ...s, speakers: e.target.value }))}
              placeholder="Ismlar, lavozimlar..."
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Materials (link yoki matn)</label>
            <input
              className="w-full rounded-xl border px-3 py-2"
              value={form.materials ?? ""}
              onChange={(e) => setForm((s) => ({ ...s, materials: e.target.value }))}
              placeholder="https://..."
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="rounded-xl border px-4 py-2"
              onClick={() => setEdit(false)}
            >
              Bekor qilish
            </button>
            <button className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700">
              <Save className="h-4 w-4" /> Saqlash
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

/* ---------- helpers ---------- */
function formatRange(startISO: string, endISO: string) {
  const s = new Date(startISO);
  const e = new Date(endISO || startISO);

  const sameDay =
    s.getFullYear() === e.getFullYear() &&
    s.getMonth() === e.getMonth() &&
    s.getDate() === e.getDate();

  const date = s.toLocaleDateString("uz-UZ", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const sh = s.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit", hour12: false });
  const eh = e.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit", hour12: false });

  return sameDay ? `${date} • ${sh} — ${eh}` : `${date} ${sh} → ${e.toLocaleString("uz-UZ")}`;
}
