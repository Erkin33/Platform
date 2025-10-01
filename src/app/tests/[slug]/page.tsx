// src/app/tests/[slug]/page.tsx
"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { getUser } from "@/lib/user";
import { getTestBySlug, addAttempt, lastAttemptFor, type TestItem } from "@/lib/tests";

/** Next.js 15 — params это Promise */
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

  if (!test) return <div className="text-neutral-600">Test topilmadi.</div>;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!test) return;
    // не даём пройти драфтовый тест
    if (test.status !== "active") return;

    const total = test.questions.length;
    if (total === 0) return alert("Bu testda savollar yo‘q.");

    let correct = 0;
    test.questions.forEach((q) => {
      if (answers[q.id] === q.correctIndex) correct++;
    });

    const scorePercent = Math.round((correct / total) * 100);
    addAttempt({ testId: test.id, userId, correct, total, scorePercent });
    setSubmitted(true);
  }

  if (submitted || last) {
    const result = lastAttemptFor(userId, test.id);
    return (
      <div className="max-w-2xl">
        <h1 className="text-2xl font-semibold">{test.title}</h1>
        <p className="text-sm text-neutral-500 mt-1">{test.subject}</p>

        <div className="mt-6 rounded-2xl border bg-white p-5">
          <div className="flex items-center gap-2 text-emerald-600">
            <CheckCircle2 className="h-5 w-5" />
            <div className="font-semibold">Test yakunlandi</div>
          </div>
          <div className="mt-3 text-[15px]">
            To‘g‘ri javoblar: <b>{result?.correct}</b> / {result?.total} — <b>{result?.scorePercent}</b>/100
          </div>
          <Link href="/tests" className="mt-6 inline-block rounded-xl border px-4 py-2 hover:bg-neutral-50">
            Testlarga qaytish
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold">{test.title}</h1>
      <p className="mt-1 text-sm text-neutral-500">
        {test.subject} • {test.durationMin} daqiqa • {test.questions.length} savol
      </p>

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
