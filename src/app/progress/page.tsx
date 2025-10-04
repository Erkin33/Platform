"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getUser } from "@/lib/user";
import { getAttendancePercent, getUserProgressPercent } from "@/lib/tests";
import {
  totalSocialScoreWithAdjustments,
  adjustmentsFor,
  addAdjustment,
  removeAdjustment,
} from "@/lib/social";

export default function ProgressPage() {
  const [viewer, setViewer] = useState<{ id: string; role: string }>({ id: "current", role: "student" });
  const [studentId, setStudentId] = useState<string>("current");

  const [mounted, setMounted] = useState(false);
  const [testAvg, setTestAvg] = useState(0);
  const [attendance, setAttendance] = useState(0);
  const [social, setSocial] = useState<{ base: number; extra: number; total: number }>({ base: 0, extra: 0, total: 0 });
  const [adjusts, setAdjusts] = useState(() => adjustmentsFor(studentId));

  useEffect(() => {
    setMounted(true);
    const u = getUser();
    const id = u.name || "current";
    const role = u.role || "student";
    setViewer({ id, role });
    setStudentId(id);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const reload = () => {
      setTestAvg(getUserProgressPercent(studentId));
      setAttendance(getAttendancePercent(studentId));
      setSocial(totalSocialScoreWithAdjustments(studentId));
      setAdjusts(adjustmentsFor(studentId));
    };
    reload();

    const onStorage = (_ev: StorageEvent) => reload();
    const onTests: EventListener = () => reload();
    const onSocial: EventListener = () => reload();

    window.addEventListener("storage", onStorage);
    window.addEventListener("uniplatform_tests_changed", onTests);
    window.addEventListener("uniplatform_social_changed", onSocial);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("uniplatform_tests_changed", onTests);
      window.removeEventListener("uniplatform_social_changed", onSocial);
    };
  }, [studentId, mounted]);

  const isAdmin = viewer.role === "admin";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Mening progresslarim</h1>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <input
              className="w-56 rounded-xl border px-3 py-2 text-sm"
              placeholder="Student ID"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              title="Ko‘rish uchun student ID"
            />
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card title="Testlar o‘rtacha natijasi">
          <ProgressBar value={mounted ? testAvg : 0} />
          <div className="mt-2 text-sm text-neutral-600" suppressHydrationWarning>
            {mounted ? `${testAvg}/100` : "–"}
          </div>
        </Card>

        <Card title="Davomat (tests asosida)">
          <ProgressBar value={mounted ? attendance : 0} />
          <div className="mt-2 text-sm text-neutral-600" suppressHydrationWarning>
            {mounted ? `${attendance}/100` : "–"}
          </div>
        </Card>

        <Card title="Ijtimoiy faollik">
          <div className="text-[28px] font-semibold" suppressHydrationWarning>
            {mounted ? social.total : "–"}
            <span className="text-base text-neutral-500"> / </span>
          </div>
          <div className="mt-2 text-sm text-neutral-600" suppressHydrationWarning>
            {mounted ? `Asosiy: ${social.base} • Tuzatishlar: ${social.extra >= 0 ? `+${social.extra}` : social.extra}` : "–"}
          </div>
          <Link href="/social" className="mt-3 inline-block rounded-xl border px-4 py-2 text-sm hover:bg-neutral-50">
            Batafsil
          </Link>
        </Card>
      </div>

      {isAdmin && mounted && (
        <AdminAdjustments
          targetId={studentId}
          viewerId={viewer.id}
          items={adjusts}
          onChanged={() => {
            setSocial(totalSocialScoreWithAdjustments(studentId));
            setAdjusts(adjustmentsFor(studentId));
          }}
        />
      )}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-white p-5">
      <div className="mb-3 text-sm font-semibold">{title}</div>
      {children}
    </div>
  );
}

function ProgressBar({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className="h-3 w-full rounded-full bg-neutral-100">
      <div className="h-3 rounded-full bg-indigo-600" style={{ width: `${v}%` }} />
    </div>
  );
}

function AdminAdjustments({
  targetId,
  viewerId,
  items,
  onChanged,
}: {
  targetId: string;
  viewerId: string;
  items: ReturnType<typeof adjustmentsFor>;
  onChanged: () => void;
}) {
  const [delta, setDelta] = useState<number>(0);
  const [comment, setComment] = useState<string>("");

  return (
    <section className="rounded-2xl border bg-white p-5">
      <div className="mb-3 text-sm font-semibold">Admin: ijtimoiy faollik uchun qo‘shimcha ballar</div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          addAdjustment({ studentId: targetId, delta, comment, actorId: viewerId });
          setDelta(0);
          setComment("");
          onChanged();
        }}
        className="grid gap-2 sm:grid-cols-4"
      >
        <input
          type="number"
          className="rounded-xl border px-3 py-2"
          placeholder="+/- ball"
          value={delta}
          onChange={(e) => setDelta(Number(e.target.value))}
        />
        <input
          className="sm:col-span-2 rounded-xl border px-3 py-2"
          placeholder="Izoh"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        <button className="rounded-xl bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700">Saqlash</button>
      </form>

      <div className="mt-4">
        <div className="mb-2 text-sm font-semibold">Tuzatishlar tarixi</div>
        <div className="rounded-xl border">
          {items.map((a) => (
            <div key={a.id} className="flex items-center justify-between border-b px-3 py-2 text-sm">
              <div className="min-w-0">
                <div className="font-medium">{a.delta >= 0 ? `+${a.delta}` : a.delta} ball</div>
                <div className="text-xs text-neutral-600">
                  {new Date(a.createdAt).toLocaleString()} • {a.actorId} {a.comment ? `• ${a.comment}` : ""}
                </div>
              </div>
              <button
                className="rounded-md border px-2 py-1 text-xs hover:bg-neutral-50"
                onClick={() => {
                  removeAdjustment(a.id);
                  onChanged();
                }}
              >
                O‘chirish
              </button>
            </div>
          ))}
          {items.length === 0 && <div className="px-3 py-2 text-sm text-neutral-500">Hozircha yo‘q.</div>}
        </div>
      </div>
    </section>
  );
}
