"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getScholarships,
  addScholarship,
  updateScholarship,
  removeScholarship,
  type Scholarship,
  type Currency,
  getProgressPercent,
  getDecision,
  setDecision,
  DECISIONS_CHANGED,
  APPLICATIONS_CHANGED,
  generateDemoApplicants,
  getWinners,
} from "@/lib/scholarships";
import { getStudents } from "@/lib/users";
import { getUser, type Role } from "@/lib/user";

export default function ScholarshipsAdminPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role | null>(null);
  const [checking, setChecking] = useState(true);

  const [list, setList] = useState<Scholarship[]>([]);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState<number>(1000000);
  const [currency, setCurrency] = useState<Currency>("UZS");
  const [deadline, setDeadline] = useState<string>("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"open" | "closed">("open");
  const [editing, setEditing] = useState<Scholarship | null>(null);

  const load = () => setList(getScholarships().sort((a, b) => b.createdAt - a.createdAt));

  useEffect(() => {
    const u = getUser();
    setRole(u.role);
    if (u.role !== "admin") {
      alert("403: Bu sahifaga faqat admin kira oladi.");
      router.replace("/scholarships");
      return;
    }
    setChecking(false);
    load();
    const on = () => load();
    window.addEventListener(APPLICATIONS_CHANGED, on);
    window.addEventListener(DECISIONS_CHANGED, on);
    window.addEventListener("storage", on);
    return () => {
      window.removeEventListener(APPLICATIONS_CHANGED, on);
      window.removeEventListener(DECISIONS_CHANGED, on);
      window.removeEventListener("storage", on);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function reset() {
    setTitle("");
    setAmount(1000000);
    setCurrency("UZS");
    setDeadline("");
    setDescription("");
    setStatus("open");
    setEditing(null);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (role !== "admin") return;
    if (!title.trim() || !deadline) return;

    if (editing) {
      updateScholarship(editing.id, {
        title,
        amount,
        currency,
        deadline,
        description,
        status,
      });
    } else {
      addScholarship({
        title,
        amount,
        currency,
        deadline,
        description,
        status,
      });
    }
    reset();
    load();
  }

  function onEdit(s: Scholarship) {
    setEditing(s);
    setTitle(s.title);
    setAmount(s.amount);
    setCurrency(s.currency);
    setDeadline(s.deadline);
    setDescription(s.description ?? "");
    setStatus(s.status);
  }
  function onDelete(id: string) {
    if (role !== "admin") return;
    if (!confirm("O‘chirish?")) return;
    removeScholarship(id);
    if (editing?.id === id) reset();
    load();
  }

  if (checking) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="rounded-2xl border bg-white p-4 text-sm text-neutral-600">
          Tekshirilmoqda…
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-2xl font-semibold">Stipendiyalar — admin</h1>

      <form onSubmit={onSubmit} className="space-y-3 rounded-2xl border bg-white p-4">
        <input
          className="w-full rounded-xl border px-3 py-2"
          placeholder="Sarlavha"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <div className="grid gap-2 sm:grid-cols-3">
          <input
            type="number"
            className="rounded-xl border px-3 py-2"
            placeholder="Miqdori"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            min={0}
          />
          <select
            className="rounded-xl border px-3 py-2"
            value={currency}
            onChange={(e) => setCurrency(e.target.value as Currency)}
          >
            <option value="UZS">UZS</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </select>
          <input
            type="date"
            className="rounded-xl border px-3 py-2"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
        </div>
        <select
          className="rounded-xl border px-3 py-2"
          value={status}
          onChange={(e) => setStatus(e.target.value as "open" | "closed")}
        >
          <option value="open">Ochiq</option>
          <option value="closed">Yopiq</option>
        </select>
        <textarea
          className="w-full rounded-xl border px-3 py-2"
          rows={4}
          placeholder="Tavsif (ixtiyoriy)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          {editing && (
            <button type="button" onClick={reset} className="rounded-xl border px-4 py-2">
              Bekor qilish
            </button>
          )}
          <button className="rounded-xl bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700">
            {editing ? "Saqlash" : "Qo‘shish"}
          </button>
        </div>
      </form>

      <div className="space-y-4">
        {list.map((s) => (
          <ScholarAdminBlock key={s.id} s={s} onEdit={() => onEdit(s)} onDelete={() => onDelete(s.id)} />
        ))}
        {list.length === 0 && (
          <div className="rounded-2xl border bg-white p-4 text-sm text-neutral-500">
            Hozircha eʼlonlar yo‘q.
          </div>
        )}
      </div>
    </div>
  );
}

function ScholarAdminBlock({
  s,
  onEdit,
  onDelete,
}: {
  s: Scholarship;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const students = getStudents();

  const rows = useMemo(() => {
    const applied = new Set(s.applicants);
    const head = students.filter((st) => applied.has(st.id));
    const tail = students.filter((st) => !applied.has(st.id));
    return [...head, ...tail];
  }, [s, students]);

  function exportWinnersCsv() {
    const winners = getWinners(s.id);
    const lines = ["userId,name,group"];
    winners.forEach((id) => {
      const st = students.find((x) => x.id === id);
      if (st) lines.push(`${st.id},"${st.name}",${st.group}`);
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${s.slug}-winners.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium">{s.title}</div>
          <div className="text-xs text-neutral-500">
            {s.amount} {s.currency} • {new Date(s.deadline).toLocaleDateString("uz-UZ")} • {s.applicants.length} ariza
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => generateDemoApplicants(s.id, 12)}
            className="rounded-xl border px-3 py-1.5 text-sm hover:bg-neutral-50"
          >
            Generate demo
          </button>
          <button
            onClick={exportWinnersCsv}
            className="rounded-xl border px-3 py-1.5 text-sm hover:bg-neutral-50"
          >
            Winners (CSV)
          </button>
          <button onClick={onEdit} className="rounded-xl border px-3 py-1.5 text-sm hover:bg-neutral-50">
            Tahrirlash
          </button>
          <button
            onClick={onDelete}
            className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-1.5 text-sm text-rose-700 hover:bg-rose-100"
          >
            O‘chirish
          </button>
        </div>
      </div>

      <div className="mt-4 overflow-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b bg-neutral-50 text-left">
              <th className="px-3 py-2">№</th>
              <th className="px-3 py-2">Talaba</th>
              <th className="px-3 py-2">Guruh</th>
              <th className="px-3 py-2">Progress</th>
              <th className="px-3 py-2">Ariza</th>
              <th className="px-3 py-2">Qaror</th>
              <th className="px-3 py-2">Amallar</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((st, idx) => {
              const p = getProgressPercent(s, st.id);
              const applied = s.applicants.includes(st.id);
              const dec = getDecision(s.id, st.id) ?? (applied ? "applied" : undefined);

              return (
                <tr key={st.id} className="border-b">
                  <td className="px-3 py-2">{idx + 1}</td>
                  <td className="px-3 py-2">{st.name}</td>
                  <td className="px-3 py-2">{st.group}</td>
                  <td className="px-3 py-2">
                    <div className="h-2 w-40 rounded bg-neutral-200">
                      <div className="h-2 rounded bg-indigo-600" style={{ width: `${p}%` }} />
                    </div>
                    <div className="mt-1 text-xs text-neutral-600">{p}%</div>
                  </td>
                  <td className="px-3 py-2">
                    {applied ? (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">Taqdim etildi</span>
                    ) : (
                      <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-700">Yo‘q</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {dec === "accepted" && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">Qabul qilindi</span>
                    )}
                    {dec === "rejected" && (
                      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs text-rose-700">Rad etildi</span>
                    )}
                    {(!dec || dec === "applied") && (
                      <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-700">
                        Ko‘rib chiqilmoqda
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <button
                        disabled={!applied}
                        onClick={() => setDecision(s.id, st.id, "accepted")}
                        className={`rounded-xl px-2 py-1 text-xs ${
                          applied
                            ? "border bg-emerald-600 text-white hover:bg-emerald-700"
                            : "border bg-neutral-200 text-neutral-500"
                        }`}
                      >
                        Qabul qilish
                      </button>
                      <button
                        disabled={!applied}
                        onClick={() => setDecision(s.id, st.id, "rejected")}
                        className={`rounded-xl px-2 py-1 text-xs ${
                          applied ? "border bg-rose-600 text-white hover:bg-rose-700" : "border bg-neutral-200 text-neutral-500"
                        }`}
                      >
                        Rad etish
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-3 text-center text-neutral-500">
                  Talabalar topilmadi.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
