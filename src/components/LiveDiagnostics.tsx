"use client";

import { useEffect, useMemo, useState } from "react";
import { getUser } from "@/lib/user";
import {
  getTests,
  getAttempts,
  getCompletedTestsCount,
  getUserProgressPercent,
  getAttendancePercent,
  ATTEMPTS_CHANGED,
  TESTS_CHANGED,
  PROGRESS_CHANGED,
  seedTests,
} from "@/lib/tests";

type Row = { k: string; v: string };

export default function LiveDiagnostics() {
  const [uid, setUid] = useState("current");
  const [testsLen, setTestsLen] = useState(0);
  const [attemptsLen, setAttemptsLen] = useState(0);
  const [completed, setCompleted] = useState(0);
  const [avg, setAvg] = useState(0);
  const [att, setAtt] = useState(0);
  const [ts, setTs] = useState<number>(Date.now());

  const lsRows: Row[] = useMemo(() => {
    const rows: Row[] = [];
    try {
      rows.push({
        k: "uniplatform_tests_v1",
        v: localStorage.getItem("uniplatform_tests_v1") || "null",
      });
      rows.push({
        k: "uniplatform_attempts_v1",
        v: localStorage.getItem("uniplatform_attempts_v1") || "null",
      });
    } catch {
      // ignore
    }
    return rows;
  }, [ts]);

  function recalc() {
    const u = getUser();
    const id = u.name || "current";
    setUid(id);

    const t = getTests();
    const a = getAttempts();
    setTestsLen(t.length);
    setAttemptsLen(a.length);

    const c = getCompletedTestsCount(id);
    const p = getUserProgressPercent(id);
    const dv = getAttendancePercent(id);

    console.log("[LiveDiagnostics] recompute", { id, tests: t.length, attempts: a.length, completed: c, avg: p, att: dv });
    setCompleted(c);
    setAvg(p);
    setAtt(dv);
    setTs(Date.now());
  }

  useEffect(() => {
    recalc();
    const onChange = () => recalc();
    window.addEventListener(ATTEMPTS_CHANGED, onChange);
    window.addEventListener(TESTS_CHANGED, onChange);
    window.addEventListener(PROGRESS_CHANGED, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(ATTEMPTS_CHANGED, onChange);
      window.removeEventListener(TESTS_CHANGED, onChange);
      window.removeEventListener(PROGRESS_CHANGED, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  function resetDemo() {
    try {
      localStorage.removeItem("uniplatform_tests_v1");
      localStorage.removeItem("uniplatform_attempts_v1");
      seedTests(); // заново посеять 3 теста и пустые попытки
      console.warn("[LiveDiagnostics] demo data reset");
      recalc();
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-neutral-200 bg-white p-4">
      <div className="mb-3 text-[13px] font-semibold">LIVE Диагностика (для проверки, что рендерится правильная страница)</div>

      <div className="grid gap-2 sm:grid-cols-3">
        <Metric label="User ID" value={uid} />
        <Metric label="Tugallangan testlar" value={`${completed}`} />
        <Metric label="Davomat (o‘rtacha %)" value={`${avg}%`} />
        <Metric label="Davomat (yakunlangan ulushi)" value={`${att}%`} />
        <Metric label="Tests (all)" value={`${testsLen}`} />
        <Metric label="Attempts (all)" value={`${attemptsLen}`} />
      </div>

      <div className="mt-4 flex gap-2">
        <button onClick={recalc} className="rounded-xl border px-3 py-1.5 text-sm hover:bg-neutral-50">Recalc</button>
        <button onClick={resetDemo} className="rounded-xl border px-3 py-1.5 text-sm text-rose-600 hover:bg-rose-50">Reset demo data</button>
      </div>

      <div className="mt-4">
        <div className="text-[12px] font-medium text-neutral-700">localStorage (сырой вид):</div>
        <div className="mt-1 grid gap-2 sm:grid-cols-2">
          {lsRows.map((r) => (
            <pre key={r.k} className="max-h-40 overflow-auto rounded-lg bg-neutral-50 p-2 text-[12px]">
{r.k}: {r.v}
            </pre>
          ))}
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 p-3">
      <div className="text-[11px] uppercase tracking-wide text-neutral-500">{label}</div>
      <div className="text-[15px] font-semibold text-neutral-900">{value}</div>
    </div>
  );
}
