// src/app/events/[slug]/page.tsx
"use client";

import { use, useEffect, useState } from "react";
import {
  getEventBySlug, updateEventBySlug,
  requestRegistration, unregisterFromEvent, acceptInvite,
  reviewRegistration, myRegStatus, hasInvite, isRegistered, spotsLeft,
  type EventItem, type EventDetails, type RegistrationForm
} from "@/lib/events";
import { getUser, type Role } from "@/lib/user";
import { CalendarDays, MapPin, Users, Save, PencilLine } from "lucide-react";
import Link from "next/link";

export default function EventDetailsPage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = use(props.params);
  const [role, setRole] = useState<Role | null>(null);
  const [userId, setUserId] = useState<string>(""); 
  const [ev, setEv] = useState<EventItem | null>(null);
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState<EventDetails>({ about: "", agenda: "", speakers: "", materials: "" });

  useEffect(() => { const u = getUser(); setRole(u.role); setUserId(u.name || "current"); }, []);
  useEffect(() => {
    const e = getEventBySlug(slug) || null; setEv(e); if (e?.details) setForm(e.details);
  }, [slug]);

  if (!ev) return <div className="text-neutral-600">Topilmadi.</div>;

  const isAdmin = role === "admin";
  const left = spotsLeft(ev);
  const registered = userId ? isRegistered(ev, userId) : false;
  const status = userId ? myRegStatus(ev, userId) : null;
  const invited = userId ? hasInvite(ev, userId) : false;

  function saveDetails(e: React.FormEvent) {
    e.preventDefault(); updateEventBySlug(slug, { details: form }); setEv(getEventBySlug(slug) || null); setEdit(false);
  }

  return (
    <div className="max-w-3xl space-y-5">
      <header>
        <h1 className="text-2xl font-semibold">{ev.title}</h1>
        <div className="mt-2 grid grid-cols-1 gap-2 text-[13px] text-neutral-700 sm:grid-cols-3">
          <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-neutral-500" />{formatRange(ev.start, ev.end)}</div>
          <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-neutral-500" />{ev.location}</div>
          <div className="flex items-center gap-2"><Users className="h-4 w-4 text-neutral-500" />{ev.participants.length} / {ev.capacity} ishtirokchi</div>
        </div>
      </header>

      {role === "student" && (
        <div className="flex flex-wrap items-center gap-2">
          {invited && (
            <button className="rounded-lg border-emerald-300 bg-emerald-50 px-3 py-1.5 text-sm text-emerald-700"
              onClick={() => { if (acceptInvite(ev.id, userId)) { alert("Taklif qabul qilindi!"); setEv(getEventBySlug(slug) || null); } else { alert("Taklifni qabul qilib bo‘lmadi."); } }}>
              Siz jamoaga taklif qilindingiz — Qabul qilish
            </button>
          )}
          {status === "pending" && <span className="rounded-lg bg-amber-50 px-3 py-1.5 text-sm text-amber-700">Ariza ko‘rib chiqilmoqda</span>}
          {status === "frozen" && <span className="rounded-lg bg-neutral-100 px-3 py-1.5 text-sm text-neutral-700">Ariza muzlatilgan</span>}
          {status === "rejected" && <span className="rounded-lg bg-rose-50 px-3 py-1.5 text-sm text-rose-700">Arizangiz rad etildi</span>}
        </div>
      )}

      {role === "student" && (
        <div className="flex items-center gap-3">
          {!registered && ev.status === "open" && left > 0 && <EnrollInline event={ev} userId={userId} onDone={() => setEv(getEventBySlug(slug) || null)} />}
          {registered && (
            <button className="rounded-lg border border-rose-300 bg-white px-4 py-2 text-sm text-rose-600 hover:bg-rose-50"
              onClick={() => { unregisterFromEvent(ev.id, userId); setEv(getEventBySlug(slug) || null); }}>
              Bekor qilish
            </button>
          )}
          <Link href="/events" className="rounded-lg border px-4 py-2 text-sm hover:bg-neutral-50">Orqaga</Link>
        </div>
      )}

      {!isAdmin || !edit ? (
        <section className="space-y-6 rounded-2xl border border-neutral-200 bg-white p-5">
          {ev.description && (<div><h3 className="text-[15px] font-semibold">Qisqacha</h3><p className="mt-1 text-[14px] text-neutral-700">{ev.description}</p></div>)}
          {ev.details?.about && (<div><h3 className="text-[15px] font-semibold">About</h3><p className="mt-1 whitespace-pre-wrap text-[14px] text-neutral-700">{ev.details.about}</p></div>)}
          {ev.details?.agenda && (<div><h3 className="text-[15px] font-semibold">Agenda</h3><p className="mt-1 whitespace-pre-wrap text-[14px] text-neutral-700">{ev.details.agenda}</p></div>)}
          {ev.details?.speakers && (<div><h3 className="text-[15px] font-semibold">Speakers</h3><p className="mt-1 whitespace-pre-wrap text-[14px] text-neutral-700">{ev.details.speakers}</p></div>)}
          {ev.details?.materials && (<div><h3 className="text-[15px] font-semibold">Materials</h3><p className="mt-1 break-words text-[14px] text-neutral-700">{ev.details.materials}</p></div>)}
          {isAdmin && (<div className="pt-2"><button onClick={() => setEdit(true)} className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm hover:bg-neutral-50"><PencilLine className="h-4 w-4" /> Tahrirlash</button></div>)}
        </section>
      ) : null}

      {isAdmin && edit && (
        <form onSubmit={saveDetails} className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-5">
          <div><label className="mb-1 block text-sm font-medium">About</label><textarea className="w-full rounded-xl border px-3 py-2" rows={4} value={form.about ?? ""} onChange={(e) => setForm((s) => ({ ...s, about: e.target.value }))} placeholder="Kengaytirilgan tavsif..." /></div>
          <div><label className="mb-1 block text-sm font-medium">Agenda</label><textarea className="w-full rounded-xl border px-3 py-2" rows={3} value={form.agenda ?? ""} onChange={(e) => setForm((s) => ({ ...s, agenda: e.target.value }))} placeholder="Kundalik tartib va vaqtlar..." /></div>
          <div><label className="mb-1 block text-sm font-medium">Speakers</label><textarea className="w-full rounded-xl border px-3 py-2" rows={2} value={form.speakers ?? ""} onChange={(e) => setForm((s) => ({ ...s, speakers: e.target.value }))} placeholder="Ismlar, lavozimlar..." /></div>
          <div><label className="mb-1 block text-sm font-medium">Materials (link yoki matn)</label><input className="w-full rounded-xl border px-3 py-2" value={form.materials ?? ""} onChange={(e) => setForm((s) => ({ ...s, materials: e.target.value }))} placeholder="https://..." /></div>
          <div className="flex justify-end gap-2"><button type="button" className="rounded-xl border px-4 py-2" onClick={() => setEdit(false)}>Bekor qilish</button><button className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700"><Save className="h-4 w-4" /> Saqlash</button></div>
        </form>
      )}
    </div>
  );
}

function EnrollInline({ event, userId, onDone }: { event: EventItem; userId: string; onDone: () => void }) {
  const [fullName, setFullName] = useState(getUser().name || "");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [faculty, setFaculty] = useState("");
  const [course, setCourse] = useState("");
  const [group, setGroup] = useState("");
  function submit(e: React.FormEvent) {
    e.preventDefault();
    const form: RegistrationForm = { fullName, phone, email, faculty, course, group, note: "" };
    requestRegistration({ eventId: event.id, userId, mode: "individual", form });
    alert("Ariza yuborildi");
    onDone();
  }
  return (
    <form onSubmit={submit} className="grid w-full gap-2 rounded-xl border p-3 sm:grid-cols-2">
      <input className="rounded-xl border px-3 py-2" placeholder="Ism familiya" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
      <input className="rounded-xl border px-3 py-2" placeholder="+998 ..." value={phone} onChange={(e) => setPhone(e.target.value)} required />
      <input className="rounded-xl border px-3 py-2 sm:col-span-2" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <input className="rounded-xl border px-3 py-2" placeholder="Fakultet" value={faculty} onChange={(e) => setFaculty(e.target.value)} required />
      <input className="rounded-xl border px-3 py-2" placeholder="Kurs" value={course} onChange={(e) => setCourse(e.target.value)} required />
      <input className="rounded-xl border px-3 py-2 sm:col-span-2" placeholder="Guruh (ixtiyoriy)" value={group} onChange={(e) => setGroup(e.target.value)} />
      <div className="sm:col-span-2"><button className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Ro‘yxatdan o‘tish</button></div>
    </form>
  );
}

function formatRange(startISO: string, endISO: string) {
  const s = new Date(startISO); const e = new Date(endISO || startISO);
  const sameDay = s.getFullYear()===e.getFullYear() && s.getMonth()===e.getMonth() && s.getDate()===e.getDate();
  const date = s.toLocaleDateString("uz-UZ", { year: "numeric", month: "2-digit", day: "2-digit" });
  const sh = s.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit", hour12: false });
  const eh = e.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit", hour12: false });
  return sameDay ? `${date} • ${sh} — ${eh}` : `${date} ${sh} → ${e.toLocaleString("uz-UZ")}`;
}
