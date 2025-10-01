// lib/sections.ts
export type BlockType = "heading" | "paragraph" | "list" | "image" | "embed" | "link";

export type Block =
  | { id: string; type: "heading"; text: string }
  | { id: string; type: "paragraph"; text: string }
  | { id: string; type: "list"; items: string[] }
  | { id: string; type: "image"; src: string; alt?: string }
  | { id: string; type: "embed"; html: string } // например, iframe YouTube
  | { id: string; type: "link"; href: string; label: string };

export type SectionItem = {
  id: string;        // может быть числовой id (как у тебя в URL) или slug
  title: string;
  description?: string;
  blocks: Block[];
  updatedAt: number;
};

const KEY = "uniplatform_sections_v1";
export const SECTIONS_CHANGED = "uniplatform_sections_changed";

const isBrowser = () => typeof window !== "undefined";
const uid = () => Math.random().toString(36).slice(2, 10);

function lsGet<T>(k: string, fb: T): T {
  if (!isBrowser()) return fb;
  try {
    const raw = window.localStorage.getItem(k);
    return raw ? (JSON.parse(raw) as T) : fb;
  } catch {
    return fb;
  }
}
function lsSet<T>(k: string, val: T) {
  if (!isBrowser()) return;
  window.localStorage.setItem(k, JSON.stringify(val));
  try {
    window.dispatchEvent(new Event(SECTIONS_CHANGED));
    window.dispatchEvent(new StorageEvent("storage", { key: k, newValue: JSON.stringify(val) }));
  } catch {}
}

/** CRUD */
export function getSections(): SectionItem[] {
  return lsGet<SectionItem[]>(KEY, []);
}
export function saveSections(list: SectionItem[]) {
  lsSet(KEY, list);
}

export function getSectionByIdOrSlug(idOrSlug: string): SectionItem | undefined {
  return getSections().find((s) => String(s.id) === String(idOrSlug));
}

export function upsertSection(data: Partial<SectionItem> & { id: string; title?: string }) {
  const list = getSections();
  const i = list.findIndex((s) => String(s.id) === String(data.id));
  if (i >= 0) {
    list[i] = {
      ...list[i],
      ...data,
      blocks: (data.blocks ?? list[i].blocks) as Block[],
      updatedAt: Date.now(),
    };
  } else {
    list.unshift({
      id: String(data.id),
      title: data.title ?? "Yangi bo‘lim",
      description: data.description ?? "",
      blocks: (data.blocks ?? []) as Block[],
      updatedAt: Date.now(),
    });
  }
  saveSections(list);
}

export function removeSection(id: string) {
  saveSections(getSections().filter((s) => String(s.id) !== String(id)));
}

/** Блоки */
export function addBlock(sectionId: string, block: Omit<Block, "id">): Block {
  const b = { ...block, id: uid() } as Block;
  const list = getSections();
  const i = list.findIndex((s) => String(s.id) === String(sectionId));
  if (i >= 0) {
    list[i].blocks.push(b);
    list[i].updatedAt = Date.now();
    saveSections(list);
  }
  return b;
}
export function updateBlock(sectionId: string, blockId: string, patch: Partial<Block>) {
  const list = getSections();
  const i = list.findIndex((s) => String(s.id) === String(sectionId));
  if (i >= 0) {
    const j = list[i].blocks.findIndex((b) => b.id === blockId);
    if (j >= 0) {
      list[i].blocks[j] = { ...list[i].blocks[j], ...patch } as Block;
      list[i].updatedAt = Date.now();
      saveSections(list);
    }
  }
}
export function deleteBlock(sectionId: string, blockId: string) {
  const list = getSections();
  const i = list.findIndex((s) => String(s.id) === String(sectionId));
  if (i >= 0) {
    list[i].blocks = list[i].blocks.filter((b) => b.id !== blockId);
    list[i].updatedAt = Date.now();
    saveSections(list);
  }
}
export function reorderBlocks(sectionId: string, fromIdx: number, toIdx: number) {
  const list = getSections();
  const i = list.findIndex((s) => String(s.id) === String(sectionId));
  if (i >= 0) {
    const arr = list[i].blocks.slice();
    const [m] = arr.splice(fromIdx, 1);
    arr.splice(toIdx, 0, m);
    list[i].blocks = arr;
    list[i].updatedAt = Date.now();
    saveSections(list);
  }
}

/** утилита: загрузить локальный файл в dataURL (для image) */
export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
}
