// lib/tests.ts
export type Question = {
  id: string;
  text: string;
  choices: string[];
  correctIndex: number;
};

export type TestStatus = "active" | "draft";

export type TestItem = {
  id: string;
  slug: string;
  title: string;
  subject: string;
  durationMin: number;
  status: TestStatus;
  questions: Question[];
};

export type Attempt = {
  id: string;
  testId: string;
  userId: string;
  correct: number;
  total: number;
  scorePercent: number; // 0..100
  finishedAt: number;   // ts
};

const K = {
  TESTS: "uniplatform_tests_v1",
  ATTEMPTS: "uniplatform_attempts_v1",
} as const;

export const TESTS_CHANGED    = "uniplatform_tests_changed";
export const ATTEMPTS_CHANGED = "uniplatform_attempts_changed";
export const PROGRESS_CHANGED = "uniplatform_progress_changed";

const isBrowser = () => typeof window !== "undefined";
export const uid = () => Math.random().toString(36).slice(2, 10);
export const slugify = (s: string) =>
  s.toLowerCase().replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-");

function lsGet<T>(key: string, fb: T): T {
  if (!isBrowser()) return fb;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fb;
  } catch {
    return fb;
  }
}
function lsSet<T>(key: string, val: T) {
  if (!isBrowser()) return;
  window.localStorage.setItem(key, JSON.stringify(val));
  try {
    window.dispatchEvent(new StorageEvent("storage", { key, newValue: JSON.stringify(val) }));
  } catch {}
}
function emit(ev: string) {
  try { window.dispatchEvent(new Event(ev)); } catch {}
}

/* ------------------ seed ------------------ */
export function seedTests() {
  if (!isBrowser()) return;
  if (!window.localStorage.getItem(K.TESTS)) {
    const qid = () => uid();
    const tests: TestItem[] = [
      {
        id: uid(),
        slug: "konstitutsiya-huquqi-final",
        title: "Konstitutsiya huquqi - Final",
        subject: "Konstitutsiya huquqi",
        durationMin: 90,
        status: "active",
        questions: [
          { id: qid(), text: "O‘zbekiston Konstitutsiyasi nechanchi yilda qabul qilingan?", choices: ["1990", "1991", "1992", "1993"], correctIndex: 2 },
          { id: qid(), text: "Oliy Majlis nechta palatadan iborat?", choices: ["1", "2", "3", "4"], correctIndex: 1 },
        ],
      },
      {
        id: uid(),
        slug: "fuqarolik-huquqi-oraliq",
        title: "Fuqarolik huquqi - Oraliq",
        subject: "Fuqarolik huquqi",
        durationMin: 60,
        status: "active",
        questions: [
          { id: qid(), text: "Shartnoma bu...", choices: ["Bir tomonlama bitim", "Ikki yoki undan ortiq shaxslar bitimi", "Sud qarori", "Farmon"], correctIndex: 1 },
          { id: qid(), text: "Asosiy mulk huquqi...", choices: ["Foydalanish", "Tasir etish", "Tasarruf etish", "Barchasi to‘g‘ri"], correctIndex: 3 },
        ],
      },
      {
        id: uid(),
        slug: "jinoyat-huquqi-test",
        title: "Jinoyat huquqi - Test",
        subject: "Jinoyat huquqi",
        durationMin: 45,
        status: "active",
        questions: [
          { id: qid(), text: "Jinoyat tarkibi elementlari to‘g‘ri ketma-ketlikda:", choices: ["Subyekt, ob’yekt, objektiv, subyektiv", "Ob’yekt, objektiv, subyekt, subyektiv", "Subyektiv, subyekt, ob’yekt, objektiv", "Objektiv, subyekt, ob’yekt, subyektiv"], correctIndex: 1 },
        ],
      },
    ];
    lsSet(K.TESTS, tests);
  }
  if (!window.localStorage.getItem(K.ATTEMPTS)) {
    lsSet<Attempt[]>(K.ATTEMPTS, []);
  }
}

/* ------------------ tests CRUD ------------------ */
export function getTests(): TestItem[] {
  seedTests();
  return lsGet<TestItem[]>(K.TESTS, []);
}
export function saveTests(list: TestItem[]) {
  lsSet(K.TESTS, list);
  emit(TESTS_CHANGED);
}

export function addTest(partial: Omit<TestItem,"id"|"slug"> & { slug?: string }) {
  // Валидация: ≥1 вопрос, у каждого ≥2 варианта
  if (!partial.questions || partial.questions.length === 0) {
    throw new Error("Kamida bitta savol bo‘lishi kerak.");
  }
  const bad = partial.questions.find(q => !q.choices || q.choices.length < 2);
  if (bad) throw new Error("Har bir savolda kamida 2 ta variant bo‘lishi kerak.");

  const t: TestItem = {
    id: uid(),
    slug: partial.slug ? slugify(partial.slug) : slugify(partial.title),
    ...partial,
    status: partial.status ?? "active",
  };
  const list = getTests();
  list.unshift(t);
  saveTests(list);
  return t;
}

export function updateTest(id: string, patch: Partial<TestItem>) {
  const list = getTests();
  const i = list.findIndex(t => t.id === id);
  if (i >= 0) {
    list[i] = { ...list[i], ...patch };
    saveTests(list);
  }
}
export function removeTest(id: string) {
  const list = getTests().filter(t => t.id !== id);
  saveTests(list);
}
export function getTestBySlug(slug: string) {
  return getTests().find(t => t.slug === slug);
}

/* ------------------ attempts ------------------ */
export function getAttempts(): Attempt[] {
  seedTests();
  return lsGet<Attempt[]>(K.ATTEMPTS, []);
}
export function saveAttempts(list: Attempt[]) {
  lsSet(K.ATTEMPTS, list);
  emit(ATTEMPTS_CHANGED);
  emit(PROGRESS_CHANGED);
}
export function addAttempt(a: Omit<Attempt,"id"|"finishedAt">) {
  const list = getAttempts();
  list.unshift({ id: uid(), finishedAt: Date.now(), ...a });
  saveAttempts(list);
}
export function attemptsByUser(userId: string) {
  return getAttempts().filter(a => a.userId === userId);
}
export function lastAttemptFor(userId: string, testId: string) {
  return attemptsByUser(userId).find(a => a.testId === testId);
}

/* ------------------ progress / attendance ------------------ */
/** Средний процент по завершённым тестам (не требуется, но оставим) */
export function getUserProgressPercent(userId: string): number {
  const list = attemptsByUser(userId);
  if (list.length === 0) return 0;
  const avg = list.reduce((s, a) => s + a.scorePercent, 0) / list.length;
  return Math.round(avg);
}

/** Кол-во завершённых тестов пользователя */
export function getCompletedTestsCount(userId: string): number {
  return attemptsByUser(userId).length;
}

/** Посещаемость (Davomat) = завершённые / все активные тесты * 100 */
export function getAttendancePercent(userId: string): number {
  const totalActive = getTests().filter(t => t.status === "active").length;
  if (totalActive === 0) return 0;
  const done = getCompletedTestsCount(userId);
  return Math.max(0, Math.min(100, Math.round((done / totalActive) * 100)));
}
