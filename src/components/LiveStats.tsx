"use client";

import { useEffect, useState } from "react";
import { getUser } from "@/lib/user";
import {
  getCompletedTestsCount,
  getUserProgressPercent,
  getAttendancePercent,
  ATTEMPTS_CHANGED,
  TESTS_CHANGED,
  PROGRESS_CHANGED,
} from "@/lib/tests";

export default function LiveStats({
  mode = "average", // "average" -> средний %, "share" -> доля завершённых
}: { mode?: "average" | "share" }) {
  const [completed, setCompleted] = useState(0);
  const [davomat, setDavomat] = useState(0);

  useEffect(() => {
    console.log("[LiveStats] mount");
    const u = getUser();
    const uid = u.name || "current";

    const load = () => {
      const c = getCompletedTestsCount(uid);
      const d =
        mode === "average"
          ? getUserProgressPercent(uid)
          : getAttendancePercent(uid);
      console.log("[LiveStats] loaded:", { completed: c, davomat: d, mode });
      setCompleted(c);
      setDavomat(d);
    };

    load();
    const onChange = () => load();
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
  }, [mode]);

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      <StatCard color="emerald" value={`${completed}`} title="Tugallangan testlar (LIVE)" />
      <StatCard color="orange" value={`${davomat}%`} title={mode === "average" ? "Davomat (o‘rtacha %, LIVE)" : "Davomat (yakunlangan ulushi, LIVE)"} />
    </div>
  );
}

function StatCard(props: { color: "emerald" | "orange"; value: string; title: string }) {
  const map: Record<string, string> = {
    emerald: "bg-[#22C55E]",
    orange: "bg-[#F97316]",
  };
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white">
      <div className="flex items-center gap-4 px-7 py-6">
        <div className={`grid h-12 w-12 place-content-center rounded-2xl text-white font-semibold ${map[props.color]}`}>
          {props.value}
        </div>
        <div className="text-[15px] text-neutral-800">{props.title}</div>
      </div>
    </div>
  );
}
