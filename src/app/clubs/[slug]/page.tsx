"use client";

import { use, useEffect, useState } from "react";
import { CalendarDays, Users } from "lucide-react";
import {
  getClubBySlug,
  joinClub,
  leaveClub,
  isMember,
  type ClubItem,
  CLUBS_CHANGED,
  MEMBERSHIP_CHANGED,
} from "@/lib/clubs";
import { getUser, type Role } from "@/lib/user";

export default function ClubDetailsPage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = use(props.params);

  const [role, setRole] = useState<Role | null>(null);
  const [uid, setUid] = useState("current");
  const [club, setClub] = useState<ClubItem | null>(null);

  const load = () => {
    const u = getUser();
    setRole(u.role);
    setUid(u.name || "current");
    setClub(getClubBySlug(slug) || null);
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
  }, [slug]);

  if (!club) return <div className="text-neutral-600">Klub topilmadi.</div>;

  const member = isMember(club, uid);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{club.title}</h1>
          <div className="mt-2 grid grid-cols-1 gap-2 text-[13px] text-neutral-700 sm:grid-cols-2">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-neutral-500" />
              {club.members.length} a'zo
            </div>
            {club.nextMeeting && (
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-neutral-500" />
                Keyingi uchrashuv: {formatDate(club.nextMeeting)}
              </div>
            )}
          </div>
        </div>
        <div className="shrink-0">
          {!member ? (
            <button
              onClick={() => joinClub(club.id, uid)}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Qo'shilish
            </button>
          ) : (
            <button
              onClick={() => leaveClub(club.id, uid)}
              className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-2 text-sm text-rose-700 hover:bg-rose-100"
            >
              Tark etish
            </button>
          )}
        </div>
      </header>

      {club.description && (
        <section className="rounded-2xl border bg-white p-5">
          <h3 className="text-[15px] font-semibold">Tavsif</h3>
          <p className="mt-1 whitespace-pre-wrap text-[14px] text-neutral-700">{club.description}</p>
        </section>
      )}

      {/* заглушка под будущий чат/файлы */}
      <section className="rounded-2xl border bg-white p-5">
        <h3 className="text-[15px] font-semibold">Chat (tez orada)</h3>
        <p className="mt-1 text-[14px] text-neutral-600">
          Bu yerda klub chati va fayllar bo‘ladi.
        </p>
      </section>
    </div>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("uz-UZ", { year: "numeric", month: "2-digit", day: "2-digit" });
}
