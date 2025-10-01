export type EventItem = {
  id: string;
  slug: string;
  title: string;
  datetime: string;
  location: string;
  capacity: number;
  description: string;
};

const KEY = "uniplatform_events";

export const uid = () => Math.random().toString(36).slice(2, 10);

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");

export function getEvents(): EventItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as EventItem[]) : [];
  } catch {
    return [];
  }
}

export function saveEvents(list: EventItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function getEventBySlug(slug: string) {
  return getEvents().find((e) => e.slug === slug);
}
