"use client";

import { useEffect, useState } from "react";
import { getUser } from "@/lib/user";
import {
  getTests,
  getAttempts,
  addAttempt,
  seedTests,
  getCompletedTestsCount,
  getUserProgressPercent,
  getAttendancePercent,
  ATTEMPTS_CHANGED,
  TESTS_CHANGED,
  PROGRESS_CHANGED,
  type TestItem,
} from "@/lib/tests";

/**
 * ЭТО КОРНЕВАЯ СТРАНИЦА / (app/page.tsx)
 * Тут нет Sidebar/Topbar — только голые данные. Нужно, чтобы исключить
 * любой другой layout/страницу, которые могли перетерать контент.
 */
export default function RootLiveDashboard() {
  const [uid, setUid] = useState("current");

  // живые метрики
  const [completed, setCompleted] = useState(0);
  const [avgPercent, setAvgPercent] = useState(0);
  const [attShare, setAttShare] = useState(0);

  // отладка: длины, сырые значения
  const [testsLen, setTestsLen] = useState(0);
  const [attemptsLen, setAttemptsLen] = useState(0);
  const [rawTests, setRawTests] = useState("[]");
  const [rawAttempts, setRawAttempts] = useState("[]");

  function recalc() {
    const u = getUser();
    const id = u.name || "current";
    setUid(id);

    // читаем и показываем сырые значения из localStorage
    const rawT = localStorage.getItem("uniplatform_tests_v1") || "[]";
    const rawA = localStorage.getItem("uniplatform_attempts_v1") || "[]";
    setRawTests(rawT);
    setRawAttempts(rawA);

    const tests = getTests();
    const atts = getAttempts();
    setTestsLen(tests.length);
    setAttemptsLen(atts.length);

    const c = getCompletedTestsCount(id);
    const av = getUserProgressPercent(id); // средний %
    const sh = getAttendancePercent(id); // доля завершённых от активных
    setCompleted(c);
    setAvgPercent(av);
    setAttShare(sh);

    console.log("[/ RootLiveDashboard] recompute", {
      id,
      tests: tests.length,
      attempts: atts.length,
      completed: c,
      avg: av,
      share: sh,
    });
  }

  useEffect(() => {
    // На всякий случай — если пусто, засеиваем демо-тесты
    seedTests();
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

  function onReset() {
    localStorage.removeItem("uniplatform_tests_v1");
    localStorage.removeItem("uniplatform_attempts_v1");
    seedTests(); // вернём 3 теста и пустые попытки
    recalc();
  }

  // Добавить одну тестовую попытку для текущего пользователя по первому тесту
  function onMockAttempt() {
    const tests = getTests();
    if (tests.length === 0) {
      alert("Tests not found");
      return;
    }
    const t: TestItem = tests[0];
    const u = getUser();
    const id = u.name || "current";

    // Сформируем ответы: для чётных вопросов — правильный ответ, для нечётных — заведомо неправильный
    const answers: Record<string, number> = {};
    t.questions.forEach((q, idx) => {
      if (idx % 2 === 0) {
        // правильный
        answers[q.id] = q.correctIndex;
      } else {
        // неправильный (берём 0, если правильный не 0; иначе 1, при наличии вариантов)
        const wrong =
          q.correctIndex !== 0
            ? 0
            : Math.min(1, Math.max(0, q.choices.length - 1));
        answers[q.id] = wrong;
      }
    });

    // Подсчёт корректных ответов
    let correct = 0;
    t.questions.forEach((q) => {
      if (answers[q.id] === q.correctIndex) correct++;
    });

    const total = t.questions.length || 0;
    if (total === 0) {
      alert("Bu testda savollar yo‘q.");
      return;
    }
    const scorePercent = Math.round((correct / total) * 100);

    // ВАЖНО: теперь добавляем answers — это требуется типом Attempt
    addAttempt({
      testId: t.id,
      userId: id,
      correct,
      total,
      scorePercent,
      answers,
    });

    recalc();
  }

  return (
    <div className="mx-auto max-w-[900px] p-6">
      <h1 className="text-2xl font-bold text-emerald-700">
        ROOT LIVE DASHBOARD (/)
      </h1>
      <p className="mt-1 text-[13px] text-neutral-600">
        Если вы видите этот заголовок, значит рендерится именно{" "}
        <code>app/page.tsx</code>, а не какой-то другой роут.
      </p>

      {/* Живые карточки */}
      <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
        <Card label="Tugallangan testlar (шт)" value={`${completed}`} />
        <Card
          label="Davomat (o‘rtacha % по завершённым)"
          value={`${avgPercent}%`}
        />
        <Card
          label="Davomat (yakunlangan ulushi)"
          value={`${attShare}%`}
        />
        <Card label="User ID" value={uid} />
      </div>

      {/* Кнопки проверки */}
      <div className="mt-6 flex flex-wrap gap-2">
        <button
          onClick={recalc}
          className="rounded-xl border px-3 py-1.5 text-sm hover:bg-neutral-50"
        >
          Recalc
        </button>
        <button
          onClick={onMockAttempt}
          className="rounded-xl border px-3 py-1.5 text-sm text-indigo-700 hover:bg-indigo-50"
        >
          Add mock attempt
        </button>
        <button
          onClick={onReset}
          className="rounded-xl border px-3 py-1.5 text-sm text-rose-600 hover:bg-rose-50"
        >
          Reset demo data
        </button>
      </div>

      {/* Отладка стораджа */}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Dump
          title="localStorage[uniplatform_tests_v1]"
          value={rawTests}
          count={testsLen}
        />
        <Dump
          title="localStorage[uniplatform_attempts_v1]"
          value={rawAttempts}
          count={attemptsLen}
        />
      </div>

      <div className="mt-6 text-[12px] text-neutral-500">
        Подсказка: если всё работает тут, но не работает на вашей «основной»
        главной — значит рендерится другой роут (например,
        <code>app/(dashboard)/page.tsx</code> внутри собственного layout).
        Тогда перенесите эту логику в нужный <code>page.tsx</code> или удалите
        старую страницу, чтобы она не перекрывала контент.
      </div>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white">
      <div className="px-6 py-5">
        <div className="text-[12px] tracking-wide text-neutral-500">
          {label}
        </div>
        <div className="mt-1 text-[20px] font-semibold text-neutral-900">
          {value}
        </div>
      </div>
    </div>
  );
}

function Dump({
  title,
  value,
  count,
}: {
  title: string;
  value: string;
  count: number;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white">
      <div className="px-6 py-4">
        <div className="text-[12px] font-medium text-neutral-700">
          {title} (count: {count})
        </div>
        <pre className="mt-2 max-h-60 overflow-auto rounded bg-neutral-50 p-2 text-[12px] leading-4">
{value}
        </pre>
      </div>
    </div>
  );
}
