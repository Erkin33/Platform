export type BookFormat = "text" | "pdf";

export type BookItem = {
  id: string;
  slug: string;
  title: string;
  author: string;
  pages: number;
  format: BookFormat;
  createdAt: number;
  text?: string;
  testSlug?: string;
};

const BOOKS_KEY = "uniplatform_books_v1";
const PROG_KEY = "uniplatform_book_progress_v1";
const RATE_KEY = "uniplatform_book_ratings_v1";

export const BOOKS_CHANGED = "books_changed";
export const BOOK_PROGRESS_CHANGED = "books_progress_changed";
export const BOOK_RATING_CHANGED = "books_rating_changed";

const isBrowser = () => typeof window !== "undefined";
export const uid = () => Math.random().toString(36).slice(2, 10);

export function slugifyIntl(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, "")
    .trim()
    .replace(/\s+/g, "-");
}
function ensureUniqueSlug(base: string, id: string, existing: BookItem[]): string {
  const raw = slugifyIntl(base);
  if (!raw) return id;
  const dup = existing.some((b) => b.slug === raw);
  return dup ? `${raw}-${id}` : raw;
}

function lsGet<T>(k: string, fb: T): T {
  if (!isBrowser()) return fb;
  try {
    const raw = localStorage.getItem(k);
    return raw ? (JSON.parse(raw) as T) : fb;
  } catch {
    return fb;
  }
}
function lsSet<T>(k: string, v: T) {
  if (!isBrowser()) return;
  localStorage.setItem(k, JSON.stringify(v));
  try {
    window.dispatchEvent(new StorageEvent("storage", { key: k, newValue: JSON.stringify(v) }));
  } catch {}
}
function emit(e: string) {
  try {
    window.dispatchEvent(new Event(e));
  } catch {}
}

const DB = "uniplatform_books_db";
const STORE = "pdfs";

function openDB(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}
export async function savePdfBlob(id: string, file: Blob) {
  const db = await openDB();
  await new Promise<void>((res, rej) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(file, id);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}
export async function getPdfBlob(id: string): Promise<Blob | null> {
  const db = await openDB();
  return await new Promise((res, rej) => {
    const tx = db.transaction(STORE, "readonly");
    const rq = tx.objectStore(STORE).get(id);
    rq.onsuccess = () => res(rq.result ?? null);
    rq.onerror = () => rej(rq.error);
  });
}
export async function deletePdfBlob(id: string) {
  const db = await openDB();
  await new Promise<void>((res, rej) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}

export function getBooks(): BookItem[] {
  return lsGet<BookItem[]>(BOOKS_KEY, []);
}
export function saveBooks(list: BookItem[]) {
  lsSet(BOOKS_KEY, list);
  emit(BOOKS_CHANGED);
}

export function addTextBook(
  data: Omit<BookItem, "id" | "slug" | "format" | "createdAt"> & { text: string }
) {
  const list = getBooks();
  const id = uid();
  const item: BookItem = {
    id,
    slug: ensureUniqueSlug(data.title, id, list),
    format: "text",
    createdAt: Date.now(),
    ...data,
  };
  list.unshift(item);
  saveBooks(list);
  return item;
}

export function addPdfBook(
  data: Omit<BookItem, "id" | "slug" | "format" | "createdAt" | "text">
) {
  const list = getBooks();
  const id = uid();
  const item: BookItem = {
    id,
    slug: ensureUniqueSlug(data.title, id, list),
    format: "pdf",
    createdAt: Date.now(),
    ...data,
  };
  list.unshift(item);
  saveBooks(list);
  return item;
}

export function removeBook(id: string) {
  saveBooks(getBooks().filter((b) => b.id !== id));
  deletePdfBlob(id).catch(() => {});
}

export function getBookBySlugOrId(param: string) {
  const books = getBooks();
  if (!param) return undefined;
  let candidate: string;
  try {
    candidate = decodeURIComponent(param);
  } catch {
    candidate = param;
  }
  let found = books.find((b) => b.slug === candidate);
  if (found) return found;
  found = books.find((b) => b.id === candidate);
  if (found) return found;
  const norm = slugifyIntl(candidate);
  found = books.find((b) => b.slug === norm);
  if (found) return found;
  found = books.find((b) => slugifyIntl(b.title) === norm);
  return found;
}

type ProgressState = Record<string, Record<string, number>>;
type RatingState = Record<string, Record<string, number>>;

function readProgress(): ProgressState {
  return lsGet(PROG_KEY, {} as ProgressState);
}
function writeProgress(s: ProgressState) {
  lsSet(PROG_KEY, s);
  emit(BOOK_PROGRESS_CHANGED);
}
function readRatings(): RatingState {
  return lsGet(RATE_KEY, {} as RatingState);
}
function writeRatings(s: RatingState) {
  lsSet(RATE_KEY, s);
  emit(BOOK_RATING_CHANGED);
}

export function getUserBookProgress(book: BookItem, userId: string): number {
  const s = readProgress();
  return Math.max(0, Math.min(100, s[book.id]?.[userId] ?? 0));
}
export function setUserBookProgress(bookId: string, userId: string, p: number) {
  const s = readProgress();
  if (!s[bookId]) s[bookId] = {};
  s[bookId][userId] = Math.max(0, Math.min(100, Math.round(p)));
  writeProgress(s);
}

export function getUserBookRating(book: BookItem, userId: string): number {
  const s = readRatings();
  return Math.max(0, Math.min(5, s[book.id]?.[userId] ?? 0));
}
export function setUserBookRating(bookId: string, userId: string, r: number) {
  const s = readRatings();
  if (!s[bookId]) s[bookId] = {};
  s[bookId][userId] = Math.max(0, Math.min(5, Math.round(r)));
  writeRatings(s);
}
export function getAverageRating(book: BookItem): string {
  const ratings = readRatings()[book.id];
  if (!ratings) return "0.0";
  const arr = Object.values(ratings);
  if (arr.length === 0) return "0.0";
  const avg = arr.reduce((sum, v) => sum + v, 0) / arr.length;
  return (Math.round(avg * 10) / 10).toFixed(1);
}
