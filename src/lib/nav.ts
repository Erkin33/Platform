// lib/nav.ts
export type IconName =
  | "FileText" | "Book" | "Users" | "Calendar" | "Award"
  | "Settings" | "Briefcase" | "DollarSign" | "Clock" | "Star";

export type CustomNavItem = { id: string; title: string; icon: IconName };

const KEY = "uniplatform_nav";
const isBrowser = () => typeof window !== "undefined";

function lsGet<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function lsSet<T>(key: string, val: T) {
  if (!isBrowser()) return;
  window.localStorage.setItem(key, JSON.stringify(val));
  // синхронизация между вкладками — безопасно проверяем window
  try {
    window.dispatchEvent(new StorageEvent("storage", { key, newValue: JSON.stringify(val) }));
  } catch {}
}

export function getCustomNav(): CustomNavItem[] {
  return lsGet<CustomNavItem[]>(KEY, []);
}
export function saveCustomNav(list: CustomNavItem[]) { lsSet(KEY, list); }
export function addCustomNav(item: CustomNavItem) {
  const list = getCustomNav();
  const idx = list.findIndex((x) => x.id === item.id);
  if (idx >= 0) { list[idx] = item; } else { list.push(item); }
  saveCustomNav([...list]);
}
export function removeCustomNav(id: string) {
  saveCustomNav(getCustomNav().filter((x) => x.id !== id));
}
