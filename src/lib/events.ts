// lib/events.ts
export type EventKind = "Takvim" | "Seminar" | "Imtihon";
export type EventStatus = "open" | "waitlist" | "closed";

export type EventDetails = {
  about?: string;
  agenda?: string;
  speakers?: string;
  materials?: string;
};

export type EventItem = {
  id: string;
  slug: string;
  title: string;
  kind: EventKind;
  /** ISO: 2025-09-22T10:00 */
  start: string;
  /** ISO: 2025-09-22T12:00 (может совпадать со start) */
  end: string;
  location: string;
  capacity: number;
  description?: string;
  status: EventStatus;
  participants: string[];
  details?: EventDetails;
};

const KEY = "uniplatform_events_v3";
export const EVENTS_CHANGED = "uniplatform_events_changed"; // <— НОВОЕ
const isBrowser = () => typeof window !== "undefined";

const uid = () => Math.random().toString(36).slice(2, 10);
export const slugify = (s: string) =>
  s.toLowerCase().replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-");

function lsGet<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try { const raw = window.localStorage.getItem(key); return raw ? (JSON.parse(raw) as T) : fallback; }
  catch { return fallback; }
}
function lsSet<T>(key: string, val: T) {
  if (!isBrowser()) return;
  window.localStorage.setItem(key, JSON.stringify(val));
  // синхронизация между вкладками
  try { window.dispatchEvent(new StorageEvent("storage", { key, newValue: JSON.stringify(val) })); } catch {}
}

/* ---- seed ---- */
export function seedEvents() {
  if (!isBrowser()) return;
  if (!window.localStorage.getItem(KEY)) {
    const list: EventItem[] = [
      {
        id: uid(),
        slug: "moot-court",
        title: "Moot Court takmimi",
        kind: "Takvim",
        start: "2025-09-20T14:00",
        end:   "2025-09-20T16:00",
        location: "Aula zali",
        capacity: 24,
        description: "Simulyatsion sud majlisi — talabalar uchun amaliy mashg'ulot.",
        status: "open",
        participants: [],
        details: { about: "Trening sud jarayoni bo‘yicha mashg‘ulot." },
      },
      {
        id: uid(),
        slug: "yuridik-seminar",
        title: "Yuridik seminar",
        kind: "Seminar",
        start: "2025-09-22T10:00",
        end:   "2025-09-22T12:00",
        location: "201-xona",
        capacity: 15,
        description: "Huquqiy tadqiqot usullari.",
        status: "open",
        participants: [],
      },
      {
        id: uid(),
        slug: "bahorgi-imtihonlar",
        title: "Bahorgi imtihonlar",
        kind: "Imtihon",
        start: "2025-09-26T09:00",
        end:   "2025-09-26T11:00",
        location: "Barcha xonalar",
        capacity: 120,
        description: "Semestr yakuniy nazoratlari.",
        status: "waitlist",
        participants: [],
      },
    ];
    lsSet(KEY, list);
  }
}

export function getEvents(): EventItem[] { seedEvents(); return lsGet<EventItem[]>(KEY, []); }

/** Сохраняем и шлём сигнал, чтобы главная/календарь мгновенно обновлялись */
export function saveEvents(list: EventItem[]) {
  lsSet(KEY, list);
  // мгновенно уведомляем открытые экраны (главная, календарь и т.п.)
  try { window.dispatchEvent(new Event(EVENTS_CHANGED)); } catch {}
  // (StorageEvent выше уже шлётся в lsSet для других вкладок)
}

export function addEvent(
  data: Omit<EventItem, "id" | "participants" | "slug" | "details"> & { slug?: string; details?: EventDetails }
) {
  const list = getEvents();
  const item: EventItem = {
    id: uid(),
    slug: data.slug ? slugify(data.slug) : slugify(data.title),
    participants: [],
    details: data.details ?? {},
    ...data,
  };
  list.unshift(item);
  saveEvents(list);
}
export function updateEvent(id: string, patch: Partial<EventItem>) {
  const list = getEvents();
  const idx = list.findIndex((e) => e.id === id);
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...patch, details: { ...list[idx].details, ...patch.details } };
    saveEvents(list);
  }
}
export function removeEvent(id: string) { saveEvents(getEvents().filter((e) => e.id !== id)); }

export function getEventBySlug(slug: string) { return getEvents().find((e) => e.slug === slug); }
export function updateEventBySlug(slug: string, patch: Partial<EventItem>) {
  const list = getEvents(); const i = list.findIndex((e) => e.slug === slug);
  if (i >= 0) { list[i] = { ...list[i], ...patch, details: { ...list[i].details, ...patch.details } }; saveEvents(list); }
}

/* ---- регистрация ---- */
export function spotsLeft(e: EventItem) { return Math.max(0, e.capacity - e.participants.length); }
export function isRegistered(e: EventItem, userId: string) { return e.participants.includes(userId); }
export function registerToEvent(id: string, userId: string) {
  const list = getEvents(); const idx = list.findIndex((e) => e.id === id); if (idx < 0) return;
  if (!list[idx].participants.includes(userId)) { list[idx].participants.push(userId); saveEvents(list); }
}
export function unregisterFromEvent(id: string, userId: string) {
  const list = getEvents(); const idx = list.findIndex((e) => e.id === id); if (idx < 0) return;
  list[idx].participants = list[idx].participants.filter((u) => u !== userId); saveEvents(list);
}

/* ---- выборки для календаря ---- */
export function eventsInRange(start: Date, end: Date) {
  const s = +start, e = +end;
  return getEvents().filter(ev => {
    const a = +new Date(ev.start);
    const b = +new Date(ev.end || ev.start);
    return a <= e && b >= s; // пересекается с диапазоном
  });
}
