"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getStreams,
  getCourses,
  getStudents,
  createSession,
  getSessions,
  setPresence,
  bulkSetPresence,
  type LessonType,
  type Stream,
  type Session,
  type Course,
  ATT_SESSIONS_CHANGED,
} from "@/lib/attendance";

export default function AttendanceAdminPage() {
  const [mounted, setMounted] = useState(false);

  // форма
  const [dateISO, setDateISO] = useState<string>(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [type, setType] = useState<LessonType>("lecture");
  const [stream, setStream] = useState<Stream>("A1");

  // данные
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseId, setCourseId] = useState<string>("");

  const [sessions, setSessions] = useState<Session[]>([]);
  const [current, setCurrent] = useState<Session | null>(null);

  // Монтируемся — только тут читаем localStorage/attendance
  useEffect(() => {
    setMounted(true);
    const cs = getCourses();
    setCourses(cs);
    if (cs[0]) setCourseId(cs[0].id);
    setSessions(getSessions());

    const on = () => setSessions(getSessions());
    window.addEventListener(ATT_SESSIONS_CHANGED, on);
    window.addEventListener("storage", on);
    return () => {
      window.removeEventListener(ATT_SESSIONS_CHANGED, on);
      window.removeEventListener("storage", on);
    };
  }, []);

  // Состав ведомости: 90 на лекции, 30 на семинар
  const roster = useMemo(() => {
    if (!mounted) return [];
    return type === "lecture" ? getStudents() : getStudents(stream);
  }, [mounted, type, stream]);

  function createAndOpen(e: React.FormEvent) {
    e.preventDefault();
    if (!courseId) return;
    const s = createSession({
      dateISO,
      courseId,
      type,
      streams: type === "lecture" ? ["A1", "A2", "A3"] : [stream],
    });
    setCurrent(s);
  }

  // Первый SSR-рендер — тот же пустой контейнер
  if (!mounted) {
    return <div className="mx-auto max-w-5xl" />;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-2xl font-semibold">Davomat — admin</h1>

      <form
        onSubmit={createAndOpen}
        className="rounded-2xl border bg-white p-4 grid gap-3 md:grid-cols-4"
      >
        <div>
          <div className="text-xs text-neutral-600 mb-1">Sana</div>
          <input
            className="w-full rounded-xl border px-3 py-2"
            type="date"
            value={dateISO}
            onChange={(e) => setDateISO(e.target.value)}
          />
        </div>

        <div>
          <div className="text-xs text-neutral-600 mb-1">Fan</div>
          <select
            className="w-full rounded-xl border px-3 py-2"
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
          >
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="text-xs text-neutral-600 mb-1">Dars turi</div>
          <select
            className="w-full rounded-xl border px-3 py-2"
            value={type}
            onChange={(e) => setType(e.target.value as LessonType)}
          >
            <option value="lecture">Leksiya (1-kurs, barcha potok)</option>
            <option value="seminar">Seminar (bitta potok)</option>
          </select>
        </div>

        <div>
          <div className="text-xs text-neutral-600 mb-1">Potok</div>
          <select
            className="w-full rounded-xl border px-3 py-2 disabled:bg-neutral-100"
            value={stream}
            onChange={(e) => setStream(e.target.value as Stream)}
            disabled={type === "lecture"}
          >
            {getStreams().map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-4 flex justify-end">
          <button className="rounded-xl bg-indigo-600 px-4 py-2 text-white">
            Yaratish & belgilang
          </button>
        </div>
      </form>

      {current && <AttendanceSheet key={current.id} session={current} roster={roster} />}

      <section className="rounded-2xl border bg-white p-4">
        <div className="text-sm font-semibold mb-2">So‘nggi darslar</div>
        <div className="space-y-2">
          {sessions.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between rounded-xl border px-3 py-2"
            >
              <div className="text-sm">
                <b>{new Date(s.dateISO).toLocaleDateString("uz-UZ")}</b> •{" "}
                {courses.find((c) => c.id === s.courseId)?.title} —{" "}
                {s.type === "lecture" ? "Leksiya" : `Seminar (${s.streams.join(",")})`}
              </div>
              <button
                onClick={() => setCurrent(s)}
                className="rounded-xl border px-3 py-1 text-sm hover:bg-neutral-50"
              >
                Ochish
              </button>
            </div>
          ))}
          {sessions.length === 0 && (
            <div className="text-sm text-neutral-500">Hozircha darslar yo‘q.</div>
          )}
        </div>
      </section>
    </div>
  );
}

function AttendanceSheet({
  session,
  roster,
}: {
  session: Session;
  roster: ReturnType<typeof getStudents>;
}) {
  // Локальная копия сессии, чтобы UI был реактивным
  const [data, setData] = useState<Session>(session);

  // При смене сессии извне — синхронизируем
  useEffect(() => {
    setData(session);
  }, [session.id]);

  // Подписка на внешние изменения (другая вкладка / другое место в приложении)
  useEffect(() => {
    const reload = () => {
      const fresh = getSessions().find((s) => s.id === session.id);
      if (fresh) setData(fresh);
    };
    window.addEventListener(ATT_SESSIONS_CHANGED, reload);
    window.addEventListener("storage", reload);
    return () => {
      window.removeEventListener(ATT_SESSIONS_CHANGED, reload);
      window.removeEventListener("storage", reload);
    };
  }, [session.id]);

  const presentIds = useMemo(
    () => Object.entries(data.marks).filter(([, v]) => v).map(([id]) => id),
    [data.marks]
  );
  const allIds = useMemo(() => roster.map((s) => s.id), [roster]);

  const allOn = () => {
    bulkSetPresence(data.id, allIds, true);
    // оптимистично
    setData((prev) => ({
      ...prev,
      marks: allIds.reduce<Record<string, boolean>>((acc, id) => {
        acc[id] = true;
        return acc;
      }, { ...prev.marks }),
    }));
  };

  const allOff = () => {
    bulkSetPresence(data.id, allIds, false);
    // оптимистично
    setData((prev) => ({
      ...prev,
      marks: allIds.reduce<Record<string, boolean>>((acc, id) => {
        acc[id] = false;
        return acc;
      }, { ...prev.marks }),
    }));
  };

  const toggleOne = (studentId: string, value: boolean) => {
    setPresence(data.id, studentId, value);
    // оптимистично
    setData((prev) => ({
      ...prev,
      marks: { ...prev.marks, [studentId]: value },
    }));
  };

  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-semibold">
          {new Date(data.dateISO).toLocaleDateString("uz-UZ")} •{" "}
          {data.type === "lecture"
            ? "Leksiya (A1+A2+A3)"
            : `Seminar (${data.streams.join(",")})`}
          <span className="ml-2 text-neutral-500">
            ({presentIds.length}/{roster.length})
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={allOn}
            className="rounded-xl border px-3 py-1 text-sm hover:bg-neutral-50"
          >
            Hammasi ✓
          </button>
          <button
            onClick={allOff}
            className="rounded-xl border px-3 py-1 text-sm hover:bg-neutral-50"
          >
            Hammasi ✕
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {roster.map((st) => {
          const checked = !!data.marks[st.id];
          return (
            <label
              key={st.id}
              className="flex items-center gap-3 rounded-xl border px-3 py-2"
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => toggleOne(st.id, e.target.checked)}
              />
              <div className="text-sm">
                {st.name}{" "}
                <span className="text-xs text-neutral-500">({st.id})</span>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}

