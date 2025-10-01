// src/lib/scholarships.ts
export type GrantStatus = "open" | "closed";
export type Currency = "UZS" | "USD" | "EUR";

export type Scholarship = {
  id: string;
  slug: string;
  title: string;
  amount: number;
  currency: Currency;
  deadline: string; // ISO date (yyyy-mm-dd)
  description?: string;
  status: GrantStatus; // хранится явно, но актуальный статус считаем ещё и от дедлайна
  applicants: string[]; // userIds подали заявку
  createdAt: number;
};

export const SCHOLARSHIPS_CHANGED = "uniplatform_scholarships_changed";
export const APPLICATIONS_CHANGED = "uniplatform_applications_changed";

const KEY = "uniplatform_scholarships_v1";
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
  try { window.dispatchEvent(new StorageEvent("storage", { key, newValue: JSON.stringify(val) })); } catch {}
}

/* ---------------- seed ---------------- */
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
        createdAt: Date.now()
      },
      {
        id: uid(),
        slug: "undp-granti",
        title: "UNDP granti",
        amount: 2000,
        currency: "USD",
        deadline: "2025-11-01",
        description: "Barqaror rivojlanish yo‘nalishida loyihalarni qo‘llab-quvvatlash.",
        status: "open",
        applicants: [],
        createdAt: Date.now() - 1000
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
        createdAt: Date.now() - 2000
      }
    ];
    lsSet(KEY, list);
  }
}

/* ---------------- utils ---------------- */
export function getScholarships(): Scholarship[] {
  seedScholarships();
  return lsGet<Scholarship[]>(KEY, []);
}
export function saveScholarships(list: Scholarship[]) {
  lsSet(KEY, list);
  emit(SCHOLARSHIPS_CHANGED);
}

export function addScholarship(data: Omit<Scholarship, "id" | "slug" | "applicants" | "createdAt"> & { slug?: string }) {
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
    createdAt: Date.now()
  };
  const list = getScholarships();
  list.unshift(item);
  saveScholarships(list);
  return item;
}
export function updateScholarship(id: string, patch: Partial<Scholarship>) {
  const list = getScholarships();
  const i = list.findIndex(s => s.id === id);
  if (i >= 0) {
    const prev = list[i];
    list[i] = { ...prev, ...patch, slug: patch.title ? slugify(patch.title) : prev.slug };
    saveScholarships(list);
  }
}
export function removeScholarship(id: string) {
  saveScholarships(getScholarships().filter(s => s.id !== id));
}

export function getBySlug(slug: string) {
  return getScholarships().find(s => s.slug === slug || s.id === slug);
}

export function isApplied(s: Scholarship, userId: string) {
  return s.applicants.includes(userId);
}
export function applyFor(id: string, userId: string) {
  const list = getScholarships();
  const i = list.findIndex(s => s.id === id);
  if (i < 0) return;
  if (!list[i].applicants.includes(userId)) {
    list[i].applicants.push(userId);
    saveScholarships(list);
    emit(APPLICATIONS_CHANGED);
  }
}
export function withdrawApplication(id: string, userId: string) {
  const list = getScholarships();
  const i = list.findIndex(s => s.id === id);
  if (i < 0) return;
  list[i].applicants = list[i].applicants.filter(u => u !== userId);
  saveScholarships(list);
  emit(APPLICATIONS_CHANGED);
}

/** Фактический статус с учётом дедлайна */
export function effectiveStatus(s: Scholarship): "open" | "closing" | "closed" {
  const now = new Date();
  const dl = new Date(s.deadline);
  if (+dl < +new Date(now.toDateString())) return "closed";
  // если до дедлайна <= 7 дней — помечаем как 'closing'
  const diffDays = Math.ceil((+dl - +now) / (1000 * 60 * 60 * 24));
  return diffDays <= 7 ? "closing" : "open";
}

export function formatAmount(amount: number, cur: Currency) {
  const locales = cur === "UZS" ? "uz-UZ" : "en-US";
  const code = cur === "UZS" ? "UZS" : cur;
  return new Intl.NumberFormat(locales, { style: "currency", currency: code, maximumFractionDigits: cur === "UZS" ? 0 : 2 })
    .format(amount);
}
