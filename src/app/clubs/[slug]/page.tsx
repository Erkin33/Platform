"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import {
  getClubBySlug,
  leaveClub,
  isApprovedMember,
  requestJoinClub,
  reviewJoin,
  setMemberRole,
  inviteToClub,
  acceptInvite,
  startAttendance,
  stopAttendance,
  checkInByCode,
  exportMembersCSV,
  importMembersCSV,
  type ClubItem,
  type ClubMember,
  type MemberRole,
  CLUBS_CHANGED,
  MEMBERSHIP_CHANGED,
} from "@/lib/clubs";
import { getUser, type Role } from "@/lib/user";

export default function ClubDetailsPage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = use(props.params);

  const [role, setRole] = useState<Role>("student");
  const [uid, setUid] = useState("current");
  const [club, setClub] = useState<ClubItem | null>(null);

  const [applyOpen, setApplyOpen] = useState(false);
  const [applyForm, setApplyForm] = useState({ fullName: "", phone: "", faculty: "", course: "", note: "" });

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteUserId, setInviteUserId] = useState("");

  const [codeInput, setCodeInput] = useState("");

  const load = useCallback(() => {
    const u = getUser();
    setRole(u.role);
    setUid(u.name || "current");
    setClub(getClubBySlug(slug) || null);
  }, [slug]);

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
  }, [load]);

  const isAdmin = role === "admin";
  const memberApproved = useMemo(() => (club ? isApprovedMember(club, uid) : false), [club, uid]);

  if (!club) return <div className="text-neutral-600">Klub topilmadi.</div>;

  const approvedCount = club.members.filter(m => m.status === "approved").length;
  const myInvite = club.members.find(m => m.userId === uid && m.status === "invited");
  const myPending = club.members.find(m => m.userId === uid && m.status === "pending");

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{club.title}</h1>
          <div className="mt-1 text-sm text-neutral-600">{approvedCount} aʼzo</div>
        </div>
        <div className="flex gap-2">
          {!memberApproved && !myPending && !myInvite && role !== "admin" && (
            <button
              onClick={() => setApplyOpen(true)}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Ariza qoldirish
            </button>
          )}
          {myPending && (
            <span className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-700">Ariza ko‘rib chiqilmoqda</span>
          )}
          {myInvite && (
            <button
              onClick={() => {
                if (acceptInvite(club.id, uid)) load();
              }}
              className="rounded-xl border-emerald-300 bg-emerald-50 px-4 py-2 text-sm text-emerald-700"
            >
              Taklifni qabul qilish
            </button>
          )}
          {memberApproved && role !== "admin" && (
            <button
              onClick={() => leaveClub(club.id, uid)}
              className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-2 text-sm text-rose-700 hover:bg-rose-100"
            >
              Tark etish
            </button>
          )}
        </div>
      </div>

      {role !== "admin" && memberApproved && (
        <section className="rounded-2xl border bg-white p-5">
          <div className="text-sm font-medium">Uchrashuvda qatnashishni tasdiqlash</div>
          {club.currentAttendance ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const ok = checkInByCode(club.id, uid, codeInput.trim());
                setCodeInput("");
                if (ok) alert("Qatnashuv tasdiqlandi");
                else alert("Kod noto‘g‘ri yoki sessiya faol emas");
                load();
              }}
              className="mt-3 flex gap-2"
            >
              <input
                className="w-40 rounded-xl border px-3 py-2 text-sm"
                placeholder="Kodni kiriting"
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value)}
              />
              <button className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
                Tasdiqlash
              </button>
            </form>
          ) : (
            <div className="mt-2 text-sm text-neutral-600">Hozircha faol sessiya yo‘q.</div>
          )}
        </section>
      )}

      {isAdmin && (
        <section className="space-y-4 rounded-2xl border bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-[15px] font-semibold">Aʼzolarni boshqarish</div>
            <div className="flex items-center gap-2">
              {!club.currentAttendance ? (
                <button
                  onClick={() => startAttendance(club.id)}
                  className="rounded-xl border px-3 py-1.5 text-sm hover:bg-neutral-50"
                >
                  Qatnashuv seansini boshlash
                </button>
              ) : (
                <button
                  onClick={() => stopAttendance(club.id)}
                  className="rounded-xl border px-3 py-1.5 text-sm hover:bg-neutral-50"
                >
                  Seansni tugatish
                </button>
              )}
              <label className="cursor-pointer rounded-xl border px-3 py-1.5 text-sm hover:bg-neutral-50">
                Import CSV
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const txt = await f.text();
                    importMembersCSV(club.id, txt);
                    load();
                  }}
                />
              </label>
              <button
                onClick={() => {
                  const csv = exportMembersCSV(club.id);
                  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url; a.download = `${club.slug}-members.csv`; a.click(); URL.revokeObjectURL(url);
                }}
                className="rounded-xl border px-3 py-1.5 text-sm hover:bg-neutral-50"
              >
                Export CSV
              </button>
              <button
                onClick={() => setInviteOpen(true)}
                className="rounded-xl bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Talabani taklif qilish
              </button>
            </div>
          </div>

          {club.currentAttendance && (
            <div className="rounded-xl bg-indigo-50 p-3 text-sm">
              Faol kod: <b>{club.currentAttendance.code}</b> • Sana: {club.currentAttendance.date}
            </div>
          )}

          <div className="space-y-2">
            {club.members.map((m) => (
              <AdminMemberRow key={m.userId} m={m} clubId={club.id} onChanged={load} />
            ))}
            {club.members.length === 0 && <div className="text-sm text-neutral-600">Hali aʼzolar yo‘q.</div>}
          </div>
        </section>
      )}

      {applyOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              requestJoinClub(club.id, uid, applyForm);
              setApplyOpen(false);
              setApplyForm({ fullName: "", phone: "", faculty: "", course: "", note: "" });
              alert("Ariza yuborildi.");
            }}
            className="w-full max-w-lg space-y-3 rounded-2xl border bg-white p-4"
          >
            <div className="text-lg font-semibold">Klubga ariza</div>
            <div className="grid gap-2 sm:grid-cols-2">
              <input className="rounded-xl border px-3 py-2" placeholder="Ism familiya" value={applyForm.fullName} onChange={e=>setApplyForm({...applyForm, fullName: e.target.value})} required />
              <input className="rounded-xl border px-3 py-2" placeholder="+998 ..." value={applyForm.phone} onChange={e=>setApplyForm({...applyForm, phone: e.target.value})} required />
              <input className="rounded-xl border px-3 py-2" placeholder="Fakultet" value={applyForm.faculty} onChange={e=>setApplyForm({...applyForm, faculty: e.target.value})} required />
              <input className="rounded-xl border px-3 py-2" placeholder="Kurs" value={applyForm.course} onChange={e=>setApplyForm({...applyForm, course: e.target.value})} required />
              <textarea className="rounded-xl border px-3 py-2 sm:col-span-2" rows={3} placeholder="Izoh (ixtiyoriy)" value={applyForm.note} onChange={e=>setApplyForm({...applyForm, note: e.target.value})} />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={()=>setApplyOpen(false)} className="rounded-xl border px-4 py-2">Bekor qilish</button>
              <button className="rounded-xl bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700">Yuborish</button>
            </div>
          </form>
        </div>
      )}

      {inviteOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              inviteToClub(club.id, inviteUserId.trim());
              setInviteUserId("");
              setInviteOpen(false);
              load();
            }}
            className="w-full max-w-md space-y-3 rounded-2xl border bg-white p-4"
          >
            <div className="text-lg font-semibold">Talabani taklif qilish</div>
            <input className="w-full rounded-xl border px-3 py-2" placeholder="userId" value={inviteUserId} onChange={(e)=>setInviteUserId(e.target.value)} required />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={()=>setInviteOpen(false)} className="rounded-xl border px-4 py-2">Bekor qilish</button>
              <button className="rounded-xl bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700">Taklif qilish</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function AdminMemberRow({ m, clubId, onChanged }: { m: ClubMember; clubId: string; onChanged: () => void }) {
  const [val, setVal] = useState<MemberRole>(m.role);
  useEffect(() => { setVal(m.role); }, [m.role]);

  return (
    <div className="flex items-center justify-between rounded-xl border px-3 py-2 text-sm">
      <div className="min-w-0">
        <div className="truncate font-medium">
          {m.profile?.fullName || m.userId} <span className="ml-2 rounded bg-neutral-100 px-2 py-0.5 text-[11px]">{m.status}</span>
        </div>
        <div className="text-neutral-600">
          {(m.profile?.phone || "")} {(m.profile?.faculty ? `• ${m.profile.faculty}` : "")} {(m.profile?.course ? `• ${m.profile.course}` : "")}
        </div>
        {m.checkins.length > 0 && <div className="text-neutral-600">Qatnashuvlar: {m.checkins.join(", ")}</div>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <select value={val} onChange={(e)=>setVal(e.target.value as MemberRole)} className="rounded-xl border px-2 py-1">
          <option value="member">Member</option>
          <option value="coordinator">Coordinator</option>
          <option value="volunteer">Volunteer</option>
        </select>
        <button onClick={()=>{ setMemberRole(clubId, m.userId, val); onChanged(); }} className="rounded-xl border px-2 py-1 hover:bg-neutral-50">
          Saqlash
        </button>
        {m.status === "pending" && (
          <>
            <button onClick={()=>{ reviewJoin(clubId, m.userId, "approve"); onChanged(); }} className="rounded-xl border-emerald-300 bg-emerald-50 px-2 py-1 text-emerald-700">Qabul</button>
            <button onClick={()=>{ reviewJoin(clubId, m.userId, "reject"); onChanged(); }} className="rounded-xl border-rose-300 bg-rose-50 px-2 py-1 text-rose-700">Rad</button>
          </>
        )}
      </div>
    </div>
  );
}
