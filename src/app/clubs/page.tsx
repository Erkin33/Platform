"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, Users } from "lucide-react";
import {
  getClubs,
  CLUBS_CHANGED,
  MEMBERSHIP_CHANGED,
  myClubs,
  requestJoinClub,
  type ClubItem,
  isApprovedMember,
} from "@/lib/clubs";
import { getUser, type Role } from "@/lib/user";

export default function ClubsPage() {
  const [role, setRole] = useState<Role | null>(null);
  const [uid, setUid] = useState("current");
  const [query, setQuery] = useState("");
  const [clubs, setClubs] = useState<ClubItem[]>([]);
  const [mine, setMine] = useState<ClubItem[]>([]);
  const [applyFor, setApplyFor] = useState<ClubItem | null>(null);
  const [form, setForm] = useState({ fullName: "", phone: "", faculty: "", course: "", note: "" });

  const load = () => {
    const u = getUser();
    setRole(u.role);
    const id = u.name || "current";
    setUid(id);
    setClubs(getClubs());
    setMine(myClubs(id));
  };

  useEffect(() => {
    load();
    const on = () => load();
    window.addEventListener(CLUBS_CHANGED, on);
    window.addEventListener(MEMBERSHIP_CHANGED, on);
    window.addEventListener("storage", on);
    return () => {
      window.removeEventListener(CLUBS_CHANGED, on);
      window.removeEventListener(MEMBERSHIP_CHANGED, on);
      window.removeEventListener("storage", on);
    };
  }, []);

  const filtered = useMemo(() => {
    const s = query.trim().toLowerCase();
    const items = clubs
      .filter((c) => c.status === "active")
      .sort((a, b) => b.createdAt - a.createdAt);
    if (!s) return items;
    return items.filter(
      (c) =>
        c.title.toLowerCase().includes(s) ||
        (c.description ?? "").toLowerCase().includes(s) ||
        c.category.toLowerCase().includes(s)
    );
  }, [clubs, query]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Klublar</h1>
        <div className="flex items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-64 rounded-xl border px-3 py-2 text-sm"
            placeholder="Qidirish..."
          />
          {role === "admin" && (
            <Link
              href="/clubs/admin"
              className="rounded-xl bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Yangi klub
            </Link>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {filtered.map((c) => (
          <ClubRow key={c.id} c={c} uid={uid} onApply={() => setApplyFor(c)} />
        ))}
        {filtered.length === 0 && (
          <div className="rounded-2xl border bg-white px-5 py-6 text-sm text-neutral-500">
            Hozircha klub topilmadi.
          </div>
        )}
      </div>

      <section className="rounded-2xl border bg-indigo-50 p-4">
        <h3 className="text-[16px] font-semibold">Mening klublarim</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {mine.length === 0 && (
            <div className="text-sm text-neutral-600">Hali aʼzo emassiz.</div>
          )}
          {mine.map((c) => (
            <div key={c.id} className="rounded-xl border bg-white p-3">
              <div className="font-medium">{c.title}</div>
              <div className="text-xs text-neutral-500">{c.category}</div>
              <div className="mt-3">
                <Link
                  href={`/clubs/${encodeURIComponent(c.slug)}`}
                  className="rounded-xl border px-3 py-1.5 text-sm hover:bg-neutral-50"
                >
                  Chat
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {applyFor && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              requestJoinClub(applyFor.id, uid, form);
              setApplyFor(null);
              setForm({ fullName: "", phone: "", faculty: "", course: "", note: "" });
              alert("Ariza yuborildi. Admin tasdiqlashini kuting.");
            }}
            className="w-full max-w-lg space-y-3 rounded-2xl border bg-white p-4"
          >
            <div className="text-lg font-semibold">Klubga ariza</div>
            <div className="rounded bg-neutral-50 p-2 text-sm">{applyFor.title}</div>
            <div className="grid gap-2 sm:grid-cols-2">
              <input className="rounded-xl border px-3 py-2" placeholder="Ism familiya" value={form.fullName} onChange={e=>setForm({...form, fullName: e.target.value})} required />
              <input className="rounded-xl border px-3 py-2" placeholder="+998 ..." value={form.phone} onChange={e=>setForm({...form, phone: e.target.value})} required />
              <input className="rounded-xl border px-3 py-2" placeholder="Fakultet" value={form.faculty} onChange={e=>setForm({...form, faculty: e.target.value})} required />
              <input className="rounded-xl border px-3 py-2" placeholder="Kurs" value={form.course} onChange={e=>setForm({...form, course: e.target.value})} required />
              <textarea className="rounded-xl border px-3 py-2 sm:col-span-2" rows={3} placeholder="Izoh (ixtiyoriy)" value={form.note} onChange={e=>setForm({...form, note: e.target.value})} />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={()=>setApplyFor(null)} className="rounded-xl border px-4 py-2">Bekor qilish</button>
              <button className="rounded-xl bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700">Yuborish</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function ClubRow({ c, uid, onApply }: { c: ClubItem; uid: string; onApply: () => void }) {
  const isMember = isApprovedMember(c, uid);
  const count = c.members.filter(m => m.status === "approved").length;

  return (
    <div className="rounded-2xl border bg-white px-5 py-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="text-[16px] font-semibold">{c.title}</div>
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-700">
              {c.category}
            </span>
          </div>
          {c.description && (
            <div className="mt-1 text-[13px] text-neutral-600 line-clamp-2">
              {c.description}
            </div>
          )}
          <div className="mt-2 grid grid-cols-1 gap-2 text-[13px] text-neutral-600 sm:grid-cols-2">
            <div className="inline-flex items-center gap-2">
              <Users className="h-4 w-4 text-neutral-500" />
              {count} aʼzo
            </div>
            {c.nextMeeting && (
              <div className="inline-flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-neutral-500" />
                Keyingi: {formatDate(c.nextMeeting)}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/clubs/${encodeURIComponent(c.slug)}`}
            className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50"
          >
            Batafsil
          </Link>
          {!isMember ? (
            <button
              onClick={onApply}
              className="rounded-xl bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Ariza qoldirish
            </button>
          ) : (
            <span className="rounded-xl border px-3 py-2 text-sm text-emerald-700">Aʼzo</span>
          )}
        </div>
      </div>
    </div>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("uz-UZ", { year: "numeric", month: "2-digit", day: "2-digit" });
}
