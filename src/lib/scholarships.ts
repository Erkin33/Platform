/* ==================== TYPES ==================== */
export type GrantStatus = "open" | "closed";
export type Currency = "UZS" | "USD" | "EUR";

export type ChecklistItem = {
  id: string;
  title: string;
  weight?: number; // если не задано — 1
};

export type Scholarship = {
  id: string;
  slug: string;
  title: string;
  amount: number;
  currency: Currency;
  deadline: string;       // ISO YYYY-MM-DD
  description?: string;
  status: GrantStatus;    // вручную, но эффективный считаем ещё и по дедлайну
  applicants: string[];   // userIds
  checklist?: ChecklistItem[]; // шаги для прогресса
  createdAt: number;
};

/* ==================== EVENTS / KEYS ==================== */
export const SCHOLARSHIPS_CHANGED = "uniplatform_scholarships_changed";
export const APPLICATIONS_CHANGED  = "uniplatform_applications_changed";
export const PROGRESS_CHANGED      = "uniplatform_scholar_progress_changed";
export const DECISIONS_CHANGED     = "uniplatform_scholar_decisions_changed";

const KEY            = "uniplatform_scholarships_v1";
const PROG_KEY       = "uniplatform_scholar_progress_v1"; // perScholar → perUser → {taskId:bool}
const DECISIONS_KEY  = "uniplatform_scholar_decisions_v1"; // perScholar → perUser → Decision

/* ==================== HELPERS ==================== */
const isBrowser = () => typeof window !== "undefined";
const uid = () => Math.random().toString(36).slice(2, 10);
export const slugify = (s: string) =>
  s.toLowerCase().replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-");

function emit(ev: string) {
  try { window.dispatchEvent(new Event(ev)); } catch {}
}
function lsGet<T>(key: string, fb: T): T {
  if (!isBrowser()) return fb;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fb;
  } catch { return fb; }
}
function lsSet<T>(key: string, val: T) {
  if (!isBrowser()) return;
  window.localStorage.setItem(key, JSON.stringify(val));
  try {
    window.dispatchEvent(new StorageEvent("storage", { key, newValue: JSON.stringify(val) }));
  } catch {}
}

/* ==================== SEED ==================== */
function defaultChecklist(): ChecklistItem[] {
  return [
    { id: "profile",  title: "Profil ma‘lumotlarini to‘ldirish", weight: 1 },
    { id: "resume",   title: "Rezyumeni yuklash (PDF)",          weight: 1 },
    { id: "letter",   title: "Motivatsion xat",                  weight: 1 },
    { id: "gpa",      title: "GPA 3.5+ (yoki dalil)",            weight: 1 },
    { id: "ref",      title: "Tavsiya xati",                     weight: 1 },
  ];
}

export function seedScholarships() {
  if (!isBrowser()) return;
  if (!window.localStorage.getItem(KEY)) {
    const list: Scholarship[] = [
      {
        id: uid(),
        slug: "prezident-stipendiyasi",
        title: "Prezident stipendiyasi",
        amount: 5_000_000,
        currency: "UZS",
        deadline: "2025-10-15",
        description: "Yuqori natijaga ega talabalar uchun moddiy qo‘llab-quvvatlash.",
        status: "open",
        applicants: [],
        checklist: defaultChecklist(),
        createdAt: Date.now(),
      },
      {
        id: uid(),
        slug: "undp-granti",
        title: "UNDP granti",
        amount: 2000,
        currency: "USD",
        deadline: "2025-11-01",
        description: "Barqaror rivojlanish yo‘nalishidagi loyihalarni qo‘llab-quvvatlash.",
        status: "open",
        applicants: [],
        checklist: defaultChecklist(),
        createdAt: Date.now() - 1000,
      },
      {
        id: uid(),
        slug: "it-startup-granti",
        title: "IT startup granti",
        amount: 10_000_000,
        currency: "UZS",
        deadline: "2025-09-30",
        description: "Talabalar startaplari uchun seed-mablag‘.",
        status: "open",
        applicants: [],
        checklist: defaultChecklist(),
        createdAt: Date.now() - 2000,
      },
    ];
    lsSet(KEY, list);
  }
}

/* ==================== CRUD ==================== */
export function getScholarships(): Scholarship[] {
  seedScholarships();
  return lsGet<Scholarship[]>(KEY, []);
}
export function saveScholarships(list: Scholarship[]) {
  lsSet(KEY, list);
  emit(SCHOLARSHIPS_CHANGED);
}
export function addScholarship(
  data: Omit<Scholarship, "id" | "slug" | "applicants" | "createdAt"> & { slug?: string }
) {
  const item: Scholarship = {
    id: uid(),
    slug: data.slug ? slugify(data.slug) : slugify(data.title),
    title: data.title,
    amount: data.amount,
    currency: data.currency,
    deadline: data.deadline,
    description: data.description,
    status: data.status ?? "open",
    applicants: [],
    checklist: data.checklist && data.checklist.length > 0 ? data.checklist : defaultChecklist(),
    createdAt: Date.now(),
  };
  const list = getScholarships();
  list.unshift(item);
  saveScholarships(list);
  return item;
}
export function updateScholarship(id: string, patch: Partial<Scholarship>) {
  const list = getScholarships();
  const i = list.findIndex((s) => s.id === id);
  if (i >= 0) {
    const prev = list[i];
    const next: Scholarship = {
      ...prev,
      ...patch,
      slug: patch.title ? slugify(patch.title) : prev.slug,
      checklist:
        patch.checklist && patch.checklist.length > 0 ? patch.checklist : prev.checklist ?? defaultChecklist(),
    };
    list[i] = next;
    saveScholarships(list);
  }
}
export function removeScholarship(id: string) {
  saveScholarships(getScholarships().filter((s) => s.id !== id));
}

export function getBySlug(slug: string) {
  return getScholarships().find((s) => s.slug === slug || s.id === slug);
}

/* ==================== APPLY / WITHDRAW ==================== */
export function isApplied(s: Scholarship, userId: string) {
  return s.applicants.includes(userId);
}
export function applyFor(id: string, userId: string) {
  const list = getScholarships();
  const i = list.findIndex((s) => s.id === id);
  if (i < 0) return;
  if (!list[i].applicants.includes(userId)) {
    list[i].applicants.push(userId);
    saveScholarships(list);
    emit(APPLICATIONS_CHANGED);
  }
}
export function withdrawApplication(id: string, userId: string) {
  const list = getScholarships();
  const i = list.findIndex((s) => s.id === id);
  if (i < 0) return;
  list[i].applicants = list[i].applicants.filter((u) => u !== userId);
  saveScholarships(list);
  emit(APPLICATIONS_CHANGED);
}

/* ==================== STATUS / AMOUNT ==================== */
export function effectiveStatus(s: Scholarship): "open" | "closing" | "closed" {
  const now = new Date();
  const dl = new Date(s.deadline);
  if (+dl < +new Date(now.toDateString())) return "closed";
  const diffDays = Math.ceil((+dl - +now) / (1000 * 60 * 60 * 24));
  return diffDays <= 7 ? "closing" : "open";
}
export function formatAmount(amount: number, cur: Currency) {
  const locales = cur === "UZS" ? "uz-UZ" : "en-US";
  const code = cur === "UZS" ? "UZS" : cur;
  return new Intl.NumberFormat(locales, {
    style: "currency",
    currency: code,
    maximumFractionDigits: cur === "UZS" ? 0 : 2,
  }).format(amount);
}

/* ==================== CHECKLIST / PROGRESS ==================== */
type ProgState = Record<string, Record<string, Record<string, boolean>>>;
// { [scholarId]: { [userId]: { [taskId]: true/false } } }

function readProg(): ProgState { return lsGet(PROG_KEY, {} as ProgState); }
function writeProg(s: ProgState) { lsSet(PROG_KEY, s); emit(PROGRESS_CHANGED); }

export function getChecklist(s: Scholarship): ChecklistItem[] {
  return (s.checklist && s.checklist.length > 0 ? s.checklist : defaultChecklist()).map((t) => ({
    ...t,
    weight: t.weight ?? 1,
  }));
}
export function getUserChecklist(sId: string, userId: string): Record<string, boolean> {
  const st = readProg();
  return st[sId]?.[userId] ?? {};
}
export function setTaskDone(sId: string, userId: string, taskId: string, done: boolean) {
  const st = readProg();
  if (!st[sId]) st[sId] = {};
  if (!st[sId][userId]) st[sId][userId] = {};
  st[sId][userId][taskId] = !!done;
  writeProg(st);
}
export function getProgressPercent(s: Scholarship, userId: string): number {
  const tasks = getChecklist(s);
  if (tasks.length === 0) return 0;
  const state = getUserChecklist(s.id, userId);
  const total = tasks.reduce((sum, t) => sum + (t.weight ?? 1), 0);
  const done = tasks.reduce((sum, t) => sum + ((state[t.id] ? (t.weight ?? 1) : 0)), 0);
  return Math.min(100, Math.round((done / total) * 100));
}

/* ==================== ADMIN DECISIONS ==================== */
export type Decision = "applied" | "accepted" | "rejected";

type DecisionsState = Record<string, Record<string, Decision>>;

function readDec(): DecisionsState { return lsGet(DECISIONS_KEY, {} as DecisionsState); }
function writeDec(s: DecisionsState) { lsSet(DECISIONS_KEY, s); emit(DECISIONS_CHANGED); }

export function getDecision(sId: string, uId: string): Decision | undefined {
  const st = readDec();
  return st[sId]?.[uId];
}
export function setDecision(sId: string, uId: string, d: Decision) {
  const st = readDec();
  if (!st[sId]) st[sId] = {};
  st[sId][uId] = d;
  writeDec(st);
}
export function getWinners(sId: string): string[] {
  const st = readDec()[sId] ?? {};
  return Object.entries(st)
    .filter(([, d]) => d === "accepted")
    .map(([id]) => id);
}
export function markApplicantsAsApplied(sId: string) {
  const list = getScholarships();
  const i = list.findIndex((s) => s.id === sId);
  if (i < 0) return;
  const st = readDec();
  if (!st[sId]) st[sId] = {};
  list[i].applicants.forEach((u) => {
    if (!st[sId][u]) st[sId][u] = "applied";
  });
  writeDec(st);
}

/* --- demo генератор заявителей --- */
import { getStudents } from "@/lib/users";
export function generateDemoApplicants(sId: string, n = 12) {
  const list = getScholarships();
  const i = list.findIndex((s) => s.id === sId);
  if (i < 0) return;
  const students = getStudents();
  const pool = students.slice().sort(() => Math.random() - 0.5).slice(0, n).map((s) => s.id);
  list[i].applicants = Array.from(new Set([...list[i].applicants, ...pool]));
  saveScholarships(list);
  markApplicantsAsApplied(sId);
  emit(APPLICATIONS_CHANGED);
}
