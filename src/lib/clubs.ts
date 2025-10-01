// src/lib/clubs.ts
export type ClubCategory = "Professional" | "Takvim" | "Boshqaruv" | "Sport" | "Fan";
export type ClubStatus = "active" | "archived";

export type ClubItem = {
  id: string;
  slug: string;
  title: string;
  category: ClubCategory;
  description?: string;
  nextMeeting?: string; // ISO: 2025-09-08
  members: string[]; // userIds
  status: ClubStatus;
  createdAt: number;
};

const KEY = "uniplatform_clubs_v1";

export const CLUBS_CHANGED = "uniplatform_clubs_changed";
export const MEMBERSHIP_CHANGED = "uniplatform_membership_changed";

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
  } catch {
    return fb;
  }
}
function lsSet<T>(key: string, val: T) {
  if (!isBrowser()) return;
  window.localStorage.setItem(key, JSON.stringify(val));
  try { window.dispatchEvent(new StorageEvent("storage", { key, newValue: JSON.stringify(val) })); } catch {}
}

/* ---------- seed ---------- */
export function seedClubs() {
  if (!isBrowser()) return;
  if (!window.localStorage.getItem(KEY)) {
    const list: ClubItem[] = [
      {
        id: uid(),
        slug: "yuridik-klub",
        title: "Yuridik klub",
        category: "Professional",
        description: "Huquqiy munozaralar, moot-sud tayyorgarligi va seminarlar.",
        nextMeeting: "2025-09-08",
        members: [],
        status: "active",
        createdAt: Date.now(),
      },
      {
        id: uid(),
        slug: "moot-court-jamoasi",
        title: "Moot Court jamoasi",
        category: "Takvim",
        description: "Taklifnomalar, sparringlar, milliy va xalqaro musobaqalar.",
        nextMeeting: "2025-09-06",
        members: [],
        status: "active",
        createdAt: Date.now() - 1000,
      },
      {
        id: uid(),
        slug: "student-kengashi",
        title: "Student kengashi",
        category: "Boshqaruv",
        description: "Talabalar tashabbuslari, tadbirlar va boshqaruv.",
        nextMeeting: "2025-09-10",
        members: [],
        status: "active",
        createdAt: Date.now() - 2000,
      },
    ];
    lsSet(KEY, list);
  }
}

/* ---------- CRUD ---------- */
export function getClubs(): ClubItem[] {
  seedClubs();
  return lsGet<ClubItem[]>(KEY, []);
}
export function saveClubs(list: ClubItem[]) {
  lsSet(KEY, list);
  emit(CLUBS_CHANGED);
}
export function addClub(data: Omit<ClubItem,"id"|"slug"|"members"|"createdAt"|"status"> & { slug?: string; status?: ClubStatus }) {
  const item: ClubItem = {
    id: uid(),
    slug: data.slug ? slugify(data.slug) : slugify(data.title),
    title: data.title,
    category: data.category,
    description: data.description,
    nextMeeting: data.nextMeeting,
    members: [],
    status: data.status ?? "active",
    createdAt: Date.now(),
  };
  const list = getClubs();
  list.unshift(item);
  saveClubs(list);
  return item;
}
export function updateClub(id: string, patch: Partial<ClubItem>) {
  const list = getClubs();
  const i = list.findIndex(c => c.id === id);
  if (i >= 0) {
    const prev = list[i];
    list[i] = { ...prev, ...patch, slug: patch.title ? slugify(patch.title) : prev.slug };
    saveClubs(list);
  }
}
export function removeClub(id: string) {
  const list = getClubs().filter(c => c.id !== id);
  saveClubs(list);
}

export function getClubBySlug(slug: string) {
  return getClubs().find(c => c.slug === slug || c.id === slug);
}

/* ---------- membership ---------- */
export function isMember(c: ClubItem, userId: string) {
  return c.members.includes(userId);
}
export function joinClub(id: string, userId: string) {
  const list = getClubs();
  const i = list.findIndex(c => c.id === id);
  if (i < 0) return;
  if (!list[i].members.includes(userId)) {
    list[i].members.push(userId);
    saveClubs(list);
    emit(MEMBERSHIP_CHANGED);
  }
}
export function leaveClub(id: string, userId: string) {
  const list = getClubs();
  const i = list.findIndex(c => c.id === id);
  if (i < 0) return;
  list[i].members = list[i].members.filter(u => u !== userId);
  saveClubs(list);
  emit(MEMBERSHIP_CHANGED);
}
export function myClubs(userId: string) {
  return getClubs().filter(c => c.members.includes(userId));
}
