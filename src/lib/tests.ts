export type Question = {
  id: string;
  text: string;
  choices: string[];
  correctIndex: number;
};

export type TestStatus = "active" | "draft";

export type QuestionBank = {
  id: string;
  title: string;
  subject: string;
  questions: Question[];
  createdAt: number;
};

export type TestItem = {
  id: string;
  slug: string;
  title: string;
  subject: string;
  durationMin: number;
  status: TestStatus;
  questions: Question[];
  createdAt: number;
};

export type Attempt = {
  id: string;
  testId: string;
  userId: string;
  correct: number;
  total: number;
  scorePercent: number;
  finishedAt: number;
  answers: Record<string, number>;
};

const K = {
  TESTS: "uniplatform_tests_v2",
  ATTEMPTS: "uniplatform_attempts_v3",
  BANKS: "uniplatform_question_banks_v1"
} as const;

export const TESTS_CHANGED = "uniplatform_tests_changed";
export const ATTEMPTS_CHANGED = "uniplatform_attempts_changed";
export const BANKS_CHANGED = "uniplatform_banks_changed";
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
  try { window.dispatchEvent(new Event("storage")); } catch {}
}
function emit(ev: string) { try { window.dispatchEvent(new Event(ev)); } catch {} }

function seed() {
  if (!isBrowser()) return;
  if (!window.localStorage.getItem(K.BANKS)) {
    const q = (text: string, choices: string[], correctIndex: number): Question => ({ id: uid(), text, choices, correctIndex });
    const banks: QuestionBank[] = [
      {
        id: uid(),
        title: "Konstitutsiya huquqi savollar bazasi",
        subject: "Konstitutsiya huquqi",
        createdAt: Date.now(),
        questions: [
          q("O‘zbekiston Konstitutsiyasi qachon qabul qilingan?", ["1990", "1991", "1992", "1993"], 2),
          q("Oliy Majlis nechta palata?", ["1", "2", "3", "4"], 1)
        ]
      },
      {
        id: uid(),
        title: "Fuqarolik huquqi savollar bazasi",
        subject: "Fuqarolik huquqi",
        createdAt: Date.now(),
        questions: [
          q("Shartnoma bu nima?", ["Bir tomonlama bitim", "Ikki yoki undan ortiq shaxslar bitimi", "Sud qarori", "Farmon"], 1),
          q("Asosiy mulk huquqi?", ["Foydalanish", "Tasir etish", "Tasarruf etish", "Barchasi to‘g‘ri"], 3)
        ]
      }
    ];
    lsSet(K.BANKS, banks);
  }
  if (!window.localStorage.getItem(K.TESTS)) lsSet<TestItem[]>(K.TESTS, []);
  if (!window.localStorage.getItem(K.ATTEMPTS)) lsSet<Attempt[]>(K.ATTEMPTS, []);
}
seed();

export function seedTests() { seed(); }

export function getBanks(): QuestionBank[] {
  seed();
  return lsGet<QuestionBank[]>(K.BANKS, []).sort((a, b) => b.createdAt - a.createdAt);
}
export function saveBanks(list: QuestionBank[]) {
  lsSet(K.BANKS, list);
  emit(BANKS_CHANGED);
}
export function addBank(data: Omit<QuestionBank, "id" | "createdAt">) {
  const list = getBanks();
  const item: QuestionBank = { id: uid(), createdAt: Date.now(), ...data };
  list.unshift(item);
  saveBanks(list);
  return item;
}
export function updateBank(id: string, patch: Partial<QuestionBank>) {
  const list = getBanks();
  const i = list.findIndex(x => x.id === id);
  if (i >= 0) {
    list[i] = { ...list[i], ...patch };
    saveBanks(list);
  }
}
export function removeBank(id: string) {
  saveBanks(getBanks().filter(x => x.id !== id));
}

export function parseCSVQuestions(csv: string): Question[] {
  const rows = csv.split(/\r?\n/).map(r => r.trim()).filter(Boolean);
  const result: Question[] = [];
  for (const row of rows) {
    const parts = row.split(";").map(s => s.trim());
    if (parts.length < 3) continue;
    const correctIndex = Math.max(0, Math.min(parts.length - 2, Number(parts[parts.length - 1])));
    const text = parts[0];
    const choices = parts.slice(1, parts.length - 1);
    if (!text || choices.length < 2) continue;
    result.push({ id: uid(), text, choices, correctIndex });
  }
  return result;
}

export function getTests(): TestItem[] {
  seed();
  return lsGet<TestItem[]>(K.TESTS, []).sort((a, b) => b.createdAt - a.createdAt);
}
export function saveTests(list: TestItem[]) {
  lsSet(K.TESTS, list);
  emit(TESTS_CHANGED);
  emit(PROGRESS_CHANGED);
}
export function addTest(partial: Omit<TestItem, "id" | "slug" | "createdAt"> & { slug?: string }) {
  if (!partial.questions || partial.questions.length === 0) throw new Error("Savollar topilmadi");
  const bad = partial.questions.find(q => !q.choices || q.choices.length < 2);
  if (bad) throw new Error("Har bir savolda kamida 2 ta variant bo‘lishi kerak");
  const t: TestItem = { id: uid(), slug: partial.slug ? slugify(partial.slug) : slugify(partial.title), createdAt: Date.now(), ...partial, status: partial.status ?? "active" };
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
  saveTests(getTests().filter(t => t.id !== id));
}
export function getTestBySlug(slug: string) {
  return getTests().find(t => t.slug === slug);
}

export function getAttempts(): Attempt[] {
  seed();
  return lsGet<Attempt[]>(K.ATTEMPTS, []);
}
export function saveAttempts(list: Attempt[]) {
  lsSet(K.ATTEMPTS, list);
  emit(ATTEMPTS_CHANGED);
  emit(PROGRESS_CHANGED);
}
export function addAttempt(a: Omit<Attempt, "id" | "finishedAt">) {
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
export function removeAttemptsFor(userId: string, testId: string) {
  const list = getAttempts().filter(a => !(a.userId === userId && a.testId === testId));
  saveAttempts(list);
}

export function sampleRandom<T>(arr: T[], n: number): T[] {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.max(0, Math.min(n, copy.length)));
}

export function getUserProgressPercent(userId: string): number {
  const list = attemptsByUser(userId);
  if (list.length === 0) return 0;
  const avg = list.reduce((s, a) => s + a.scorePercent, 0) / list.length;
  return Math.round(avg);
}
export function getCompletedTestsCount(userId: string): number {
  return attemptsByUser(userId).length;
}
export function getAttendancePercent(userId: string): number {
  const totalActive = getTests().filter(t => t.status === "active").length;
  if (totalActive === 0) return 0;
  const done = getCompletedTestsCount(userId);
  return Math.max(0, Math.min(100, Math.round((done / totalActive) * 100)));
}
