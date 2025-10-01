// lib/user.ts
export type Role = "admin" | "student";
export type User = { name: string; initials: string; course: string; dept: string; role: Role; };
export type NotificationItem = { id: string; title: string; subtitle?: string; read: boolean; createdAt: number };

const K = { USER: "uniplatform_user", NOTIFS: "uniplatform_notifications" } as const;

export const USER_CHANGED  = "uniplatform_user_changed";
export const NOTIF_CHANGED = "uniplatform_notif_changed";

export const uid = () => Math.random().toString(36).slice(2, 10);
const isBrowser = () => typeof window !== "undefined";

/* LS helpers */
function lsGet<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try { const raw = window.localStorage.getItem(key); return raw ? (JSON.parse(raw) as T) : fallback; }
  catch { return fallback; }
}
function lsSet<T>(key: string, val: T) {
  if (!isBrowser()) return;
  window.localStorage.setItem(key, JSON.stringify(val));
}

/* USER */
export function getUser(): User {
  const fallback: User = { name: "Akmal Karimov", initials: "AK", course: "3-kurs", dept: "IT", role: "admin" };
  const u = lsGet<User>(K.USER, fallback);
  if (isBrowser() && !window.localStorage.getItem(K.USER)) lsSet(K.USER, u);
  return u;
}
export function saveUser(u: User) {
  lsSet(K.USER, u);
  if (isBrowser()) window.dispatchEvent(new Event(USER_CHANGED));
}
export function toggleRole(): User {
  const u = getUser();
  const next: User = { ...u, role: u.role === "admin" ? "student" : "admin" };
  saveUser(next);
  return next;
}

/* NOTIFICATIONS */
export function getNotifications(): NotificationItem[] {
  const list = lsGet<NotificationItem[]>(K.NOTIFS, []);
  if (isBrowser() && list.length === 0) {
    const now = Date.now();
    const seeded: NotificationItem[] = [
      { id: uid(), title: "Konstitutsiya huquqi testi", subtitle: "Baholandi: 92%", read: false, createdAt: now - 60_000 },
      { id: uid(), title: "Yangi tadbir", subtitle: "Moot Court • 20-sent 14:00", read: false, createdAt: now - 3_600_000 },
      { id: uid(), title: "Kutubxona eslatmasi", subtitle: "Kitobni qaytarish muddati yaqin", read: true, createdAt: now - 86_400_000 },
    ];
    lsSet(K.NOTIFS, seeded);
    return seeded;
  }
  return list;
}
export function saveNotifications(list: NotificationItem[]) {
  lsSet(K.NOTIFS, list);
  if (isBrowser()) window.dispatchEvent(new Event(NOTIF_CHANGED));
}
export function unreadCount(): number {
  return getNotifications().filter((n) => !n.read).length;
}
export function markAllRead() {
  const next = getNotifications().map((n) => ({ ...n, read: true }));
  saveNotifications(next);
}
export function addNotification(n: Omit<NotificationItem,"id"|"createdAt"|"read"> & { read?: boolean }) {
  const list = getNotifications();
  list.unshift({ id: uid(), createdAt: Date.now(), read: false, ...n });
  saveNotifications(list);
}

/* NEW: удалить одно уведомление */
export function removeNotification(id: string) {
  const next = getNotifications().filter(n => n.id !== id);
  saveNotifications(next);
}

/* NEW: очистить все уведомления */
export function clearNotifications() {
  saveNotifications([]);
}
