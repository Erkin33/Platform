// src/app/tests/[slug]/page.tsx
"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, RotateCcw } from "lucide-react";
import { getUser } from "@/lib/user";
import {
  getTestBySlug,
  addAttempt,
  lastAttemptFor,
  removeAttemptsFor,
  attemptsCountFor,
  type TestItem
} from "@/lib/tests";

export default function TestRunner(props: { params: Promise<{ slug: string }> }) {
  const { slug } = use(props.params);
  const [userId, setUserId] = useState<string>("current");
  const [test, setTest] = useState<TestItem | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const u = getUser();
    setUserId(u.name || "current");
    setTest(getTestBySlug(slug) ?? null);
  }, [slug]);

  const last = useMemo(() => (test ? lastAttemptFor(userId, test.id) : undefined), [test, userId]);
  const made = useMemo(() => (test ? attemptsCountFor(userId, test.id) : 0), [test, userId]);
  const limitReached = !!test && test.attemptsLimit > 0 && made >= test.attemptsLimit;

  if (!test) return <div className="text-neutral-600">Test topilmadi.</div>;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!test || test.status !== "active") return;
    if (limitReached) return;

    const total = test.questions.length;
    if (total === 0) return alert("Bu testda savollar yo‘q.");
    let correct = 0;
    test.questions.forEach((q) => { if (answers[q.id] === q.correctIndex) correct++; });

    const scorePercent = Math.round((correct / total) * 100);
    const scorePoints = correct * (test.pointsPerQuestion || 1);

    addAttempt({ testId: test.id, userId, correct, total, scorePercent, scorePoints, answers });
    setSubmitted(true);
  }

  const showResult = submitted || !!last;
  const result = showResult ? lastAttemptFor(userId, test.id) : undefined;

  if (limitReached && !showResult) {
    return (
      <div className="max-w-3xl">
        <h1 className="text-2xl font-semibold">{test.title}</h1>
        <p className="text-sm text-neutral-500 mt-1">{test.subject}</p>
        <div className="mt-6 rounded-2xl border bg-white p-5">
          <div className="text-[15px]">
            Ushbu test uchun urinishlar limiti tugagan: <b>{test.attemptsLimit}</b>
          </div>
        </div>
        <Link href="/tests" className="mt-6 inline-block rounded-xl border px-4 py-2 hover:bg-neutral-50">Testlarga qaytish</Link>
      </div>
    );
  }

  if (showResult && result) {
    return (
      <div className="max-w-3xl">
        <h1 className="text-2xl font-semibold">{test.title}</h1>
        <p className="text-sm text-neutral-500 mt-1">{test.subject}</p>

        <div className="mt-6 rounded-2xl border bg-white p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
              <div className="font-semibold">Test yakunlandi</div>
            </div>
            <button
              className="inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm hover:bg-neutral-50"
              onClick={() => {
                removeAttemptsFor(userId, test.id);
                setSubmitted(false);
                setAnswers({});
              }}
              title="Qayta urinish"
            >
              <RotateCcw className="h-4 w-4" /> Qayta urinish
            </button>
          </div>

          <div className="mt-3 text-[15px]">
            To‘g‘ri javoblar: <b>{result.correct}</b> / {result.total} — <b>{result.scorePercent}</b>/100
            <div className="mt-1">Umumiy ball: <b>{result.scorePoints}</b> (ball/savol: {test.pointsPerQuestion})</div>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {test.questions.map((q, idx) => {
            const selected = result.answers[q.id];
            const isCorrect = selected === q.correctIndex;
            return (
              <div
                key={q.id}
                className={`rounded-2xl border p-4 ${isCorrect ? "bg-emerald-50 border-emerald-200" : "bg-rose-50/60 border-rose-200"}`}
              >
                <div className="mb-3 font-medium">
                  {idx + 1}. {q.text}
                </div>
                <div className="grid gap-2">
                  {q.choices.map((choice, i) => {
                    const chosen = selected === i;
                    const correct = q.correctIndex === i;
                    const ring =
                      correct ? "ring-2 ring-emerald-400" : chosen && !correct ? "ring-2 ring-rose-400" : "ring-0";
                    const bg =
                      correct ? "bg-emerald-100/70" : chosen && !correct ? "bg-rose-100/70" : "bg-white";
                    return (
                      <div key={i} className={`rounded-lg border px-3 py-2 text-sm ${bg} ${ring}`}>
                        <div className="flex items-center gap-2">
                          <input type="radio" disabled checked={chosen} className="h-4 w-4" readOnly />
                          <span>{choice}</span>
                          {correct && <span className="ml-2 rounded bg-emerald-200 px-2 py-0.5 text-[11px]">To‘g‘ri</span>}
                          {chosen && !correct && <span className="ml-2 rounded bg-rose-200 px-2 py-0.5 text-[11px]">Noto‘g‘ri</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <Link href="/tests" className="mt-6 inline-block rounded-xl border px-4 py-2 hover:bg-neutral-50">
          Testlarga qaytish
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold">{test.title}</h1>
      <p className="mt-1 text-sm text-neutral-500">
        {test.subject} • {test.durationMin} daqiqa • {test.questions.length} savol
      </p>
      {test.attemptsLimit > 0 && (
        <p className="text-xs text-neutral-500 mt-1">
          Urinishlar: {attemptsCountFor(userId, test.id)} / {test.attemptsLimit}
        </p>
      )}

      <form onSubmit={submit} className="mt-5 space-y-5">
        {test.questions.map((q, idx) => (
          <div key={q.id} className="rounded-2xl border bg-white p-4">
            <div className="mb-3 font-medium">{idx + 1}. {q.text}</div>
            <div className="grid gap-2">
              {q.choices.map((choice, i) => (
                <label key={i} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name={q.id}
                    className="h-4 w-4"
                    checked={answers[q.id] === i}
                    onChange={() => setAnswers((s) => ({ ...s, [q.id]: i }))}
                  />
                  <span>{choice}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
        <div className="flex justify-end">
          <button className="rounded-xl bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700">
            Yakunlash
          </button>
        </div>
      </form>
    </div>
  );
}
