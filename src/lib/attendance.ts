// lib/attendance.ts
// Хранилище "Давомат" (attendance)
// Потоки: A1, A2, A3 — по 30 студентов каждый
// Тип занятия: lecture (берёт сразу A1+A2+A3) или seminar (ровно один поток)

export type Stream = "A1" | "A2" | "A3";
export type LessonType = "lecture" | "seminar";

export type Student = {
  id: string;          // уникальный id (например A1-01)
  name: string;        // имя (A1 Student 01)
  stream: Stream;      // поток
};

export type Course = {
  id: string;          // law-const, law-civil ...
  title: string;       // Констит. право, и т.д.
  teacher: string;     // преподаватель
};

export type Session = {
  id: string;
  dateISO: string;     // 2025-09-21
  courseId: string;
  type: LessonType;    // "lecture" | "seminar"
  streams: Stream[];   // какие потоки участвуют (для лекции всегда ["A1","A2","A3"])
  // отметки: { [studentId]: true/false } — отсутствие ключа = отсутствовал
  marks: Record<string, boolean>;
};

const K = {
  STUDENTS: "uniplatform_att_students_v1",
  COURSES:  "uniplatform_att_courses_v1",
  SESSIONS: "uniplatform_att_sessions_v1",
} as const;

export const ATT_STUDENTS_CHANGED = "att_students_changed";
export const ATT_COURSES_CHANGED  = "att_courses_changed";
export const ATT_SESSIONS_CHANGED = "att_sessions_changed";

const isBrowser = () => typeof window !== "undefined";
const uid = () => Math.random().toString(36).slice(2, 10);

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
function emit(ev: string) { try { window.dispatchEvent(new Event(ev)); } catch {} }

/* ---------------- SEED ---------------- */

function seedStudents() {
  if (!isBrowser()) return;
  if (window.localStorage.getItem(K.STUDENTS)) return;

  const build = (stream: Stream): Student[] =>
    Array.from({ length: 30 }, (_, i) => {
      const n = (i + 1).toString().padStart(2, "0");
      return { id: `${stream}-${n}`, name: `${stream} Student ${n}`, stream };
    });

  const list = [...build("A1"), ...build("A2"), ...build("A3")];
  lsSet(K.STUDENTS, list);
}

function seedCourses() {
  if (!isBrowser()) return;
  if (window.localStorage.getItem(K.COURSES)) return;

  const courses: Course[] = [
    { id: "law-const", title: "Konstitutsiya huquqi", teacher: "Prof. A.Saidov" },
    { id: "law-civil", title: "Fuqarolik huquqi",     teacher: "Prof. H.Rahmonqulov" },
    { id: "law-crim",  title: "Jinoyat huquqi",       teacher: "Dots. B.Karimov" },
  ];
  lsSet(K.COURSES, courses);
}

function seedSessions() {
  if (!isBrowser()) return;
  if (!window.localStorage.getItem(K.SESSIONS)) {
    const list: Session[] = [];
    lsSet(K.SESSIONS, list);
  }
}

export function seedAttendance() {
  seedStudents();
  seedCourses();
  seedSessions();
}

/* -------------- GETTERS --------------- */

export function getStreams(): Stream[] { return ["A1","A2","A3"]; }

export function getStudents(stream?: Stream): Student[] {
  seedAttendance();
  const all = lsGet<Student[]>(K.STUDENTS, []);
  return stream ? all.filter(s => s.stream === stream) : all;
}

export function getCourses(): Course[] {
  seedAttendance();
  return lsGet<Course[]>(K.COURSES, []);
}

export function getSessions(): Session[] {
  seedAttendance();
  return lsGet<Session[]>(K.SESSIONS, []);
}
function saveSessions(list: Session[]) {
  lsSet(K.SESSIONS, list);
  emit(ATT_SESSIONS_CHANGED);
}

/* -------------- SESSIONS CRUD --------- */

export function createSession(data: {
  dateISO: string;
  courseId: string;
  type: LessonType;
  streams: Stream[]; // для seminar — ровно один, для lecture будет игнорирован
}) {
  const list = getSessions();

  const streams: Stream[] = data.type === "lecture" ? ["A1","A2","A3"] : data.streams.slice(0,1) as Stream[];
  const sess: Session = {
    id: uid(),
    dateISO: data.dateISO,
    courseId: data.courseId,
    type: data.type,
    streams,
    marks: {},
  };
  list.unshift(sess);
  saveSessions(list);
  return sess;
}

export function updateSession(id: string, patch: Partial<Session>) {
  const list = getSessions();
  const i = list.findIndex(s => s.id === id);
  if (i >= 0) {
    list[i] = { ...list[i], ...patch };
    saveSessions(list);
  }
}
export function removeSession(id: string) {
  saveSessions(getSessions().filter(s => s.id !== id));
}

export function getSession(id: string) {
  return getSessions().find(s => s.id === id);
}

/* -------------- MARKS ----------------- */

export function setPresence(sessionId: string, studentId: string, present: boolean) {
  const list = getSessions();
  const i = list.findIndex(s => s.id === sessionId);
  if (i < 0) return;
  const marks = { ...list[i].marks };
  marks[studentId] = present;
  list[i] = { ...list[i], marks };
  saveSessions(list);
}

export function bulkSetPresence(sessionId: string, students: string[], present: boolean) {
  const list = getSessions();
  const i = list.findIndex(s => s.id === sessionId);
  if (i < 0) return;
  const marks = { ...list[i].marks };
  students.forEach(id => { marks[id] = present; });
  list[i] = { ...list[i], marks };
  saveSessions(list);
}

/* -------------- STATS ----------------- */

// статистика для конкретного студента по курсу
export function getStudentCourseStats(studentId: string, courseId: string) {
  const sessions = getSessions().filter(s => s.courseId === courseId);
  const total = sessions.length;
  const attended = sessions.filter(s => {
    // студент присутствует, если сессия содержит его поток и marks[student]=true
    const inScope =
      s.type === "lecture" ||
      (s.type === "seminar" && s.streams.includes(studentId.split("-")[0] as Stream));
    if (!inScope) return false;
    return !!s.marks[studentId];
  }).length;

  const percent = total > 0 ? Math.round((attended / total) * 100) : 0;
  return { total, attended, percent };
}

// общая сводка (средний % по всем курсам)
export function getStudentOverallAttendance(studentId: string) {
  const courses = getCourses();
  if (courses.length === 0) return 0;
  const sum = courses.reduce((acc, c) => acc + getStudentCourseStats(studentId, c.id).percent, 0);
  return Math.round(sum / courses.length);
}
