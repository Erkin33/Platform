"use client";

import { useEffect, useMemo, useState } from "react";
import { ClipboardCheck, Eye, Upload, X } from "lucide-react";
import {
  getCriteria,
  getSubmissions,
  getStudentSubmissions,
  createOrUpdateSubmission,
  reviewSubmission,
  SOCIAL_CHANGED,
  socialBreakdownFor,
  totalSocialScoreFor,
  type Criterion,
  type SocialSubmission,
} from "@/lib/social";
import { getUser } from "@/lib/user";

/* утилиты */
const percent = (num: number, den: number) =>
  den <= 0 ? 0 : Math.max(0, Math.min(100, Math.round((num / den) * 100)));

/* роли модераторов */
type ModeratorRole = "tutor" | "deputy" | "dean" | "admin";
const toModeratorRole = (r: string): ModeratorRole =>
  (["tutor", "deputy", "dean", "admin"] as const).includes(
    r as ModeratorRole
  )
    ? (r as ModeratorRole)
    : "tutor";

export default function SocialPage() {
  const [role, setRole] = useState<string>("student");
  const [userId, setUserId] = useState<string>("current");

  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [subs, setSubs] = useState<SocialSubmission[]>([]);
  const [mounted, setMounted] = useState(false);

  /* монтирование и загрузка */
  useEffect(() => {
    setMounted(true);
    const u = getUser();
    setRole(u.role || "student");
    setUserId(u.name || "current");

    const reload = () => {
      setCriteria(getCriteria());
      setSubs(getSubmissions());
    };
    reload();

    const onSocial: EventListener = () => reload();
    const onStorage = (_ev: StorageEvent) => reload();

    window.addEventListener(SOCIAL_CHANGED, onSocial);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(SOCIAL_CHANGED, onSocial);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const my = useMemo(
    () => (mounted ? getStudentSubmissions(userId) : []),
    [mounted, userId, subs]
  );

  const isStudent = role === "student";
  const isTutor = role === "tutor" || role === "admin";
  const isDeputy = role === "deputy" || role === "admin";
  const isDean = role === "dean" || role === "admin";
  const isModerator = isTutor || isDeputy || isDean || role === "admin";

  /* сводка */
  const totalMax = useMemo(
    () => criteria.reduce((s, c) => s + c.maxScore, 0),
    [criteria]
  );
  const total = useMemo(
    () => (mounted ? totalSocialScoreFor(userId) : 0),
    [mounted, userId, subs, criteria]
  );
  const totalPct = mounted ? percent(total, totalMax) : 0;

  const [openFor, setOpenFor] = useState<Criterion | null>(null);
  const [preview, setPreview] = useState<SocialSubmission | null>(null);

  /* визуал */
  return (
    <div className="space-y-6">
      {/* шапка с прогрессом */}
      <div className="rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 p-5 text-white">
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="text-[13px] opacity-80">Ijtimoiy faollik indeksi</div>
            <div className="text-2xl font-semibold">2024–2025 o‘quv yili</div>
          </div>
          <div className="text-right">
            <div
              className="text-3xl font-bold leading-none"
              suppressHydrationWarning
            >
              {mounted ? total : 0}
            </div>
            <div className="text-[12px] opacity-80" suppressHydrationWarning>
              / {mounted ? totalMax : 0} ball
            </div>
          </div>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/20">
          <div
            className="h-2 rounded-full bg-white/90"
            style={{ width: `${totalPct}%` }}
          />
        </div>
        <div className="mt-1 text-[12px] opacity-90" suppressHydrationWarning>
          Umumiy ko‘rsatkich: {mounted ? totalPct : 0}%
        </div>
      </div>

      {/* студенту — карточки отправки */}
      {isStudent && (
        <section className="rounded-2xl border bg-white p-4">
          <div className="mb-3 text-sm font-semibold">Baholash mezonlari</div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {criteria.map((c, idx) => {
              const mine = my.find((s) => s.criterionId === c.id);
              const breakdown = socialBreakdownFor(userId);
              const score = mounted
                ? breakdown.find((b) => b.criterion.id === c.id)?.score || 0
                : 0;
              const p = mounted ? percent(score, c.maxScore) : 0;
              const chip =
                p >= 80
                  ? { t: "Yaxshi", cls: "bg-emerald-100 text-emerald-800" }
                  : p >= 50
                  ? { t: "O‘rtacha", cls: "bg-amber-100 text-amber-800" }
                  : { t: "Boshlang‘ich", cls: "bg-neutral-100 text-neutral-700" };

              return (
                <div key={c.id} className="rounded-xl border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">
                        {idx + 1}. {c.title}
                      </div>
                      {c.subtitle && (
                        <div className="truncate text-xs text-neutral-600">
                          {c.subtitle}
                        </div>
                      )}
                      {c.note && (
                        <div className="mt-1 truncate text-xs text-neutral-600">
                          {c.note}
                        </div>
                      )}
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] ${chip.cls}`}>
                      {chip.t}
                    </span>
                  </div>

                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-neutral-100">
                    <div
                      className="h-2 rounded-full bg-indigo-500"
                      style={{ width: `${p}%` }}
                    />
                  </div>

                  <div
                    className="mt-1 flex items-center justify-between text-[12px] text-neutral-600"
                    suppressHydrationWarning
                  >
                    <span>
                      <b>{mounted ? score : 0}</b> / {mounted ? c.maxScore : 0} ball
                    </span>
                    {mine?.status && (
                      <span className="rounded bg-neutral-100 px-2 py-0.5">
                        {mine.status}
                      </span>
                    )}
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={() => setOpenFor(c)}
                      className="inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm hover:bg-neutral-50"
                    >
                      <Upload className="h-4 w-4" /> Hujjat topshirish
                    </button>
                    {mine && (
                      <button
                        onClick={() => setPreview(mine)}
                        className="inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm hover:bg-neutral-50"
                      >
                        <Eye className="h-4 w-4" /> Ko‘rish
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* модерация */}
      {isModerator && (
        <section className="rounded-2xl border bg-white p-4">
          <div className="mb-3 inline-flex items-center gap-2 text-sm font-semibold">
            <ClipboardCheck className="h-4 w-4" /> Moderatsiya
          </div>
          <ReviewList
            role={role}
            items={subs}
            onPreview={(s) => setPreview(s)}
            onDecide={(args) => reviewSubmission(args)}
          />
        </section>
      )}

      {/* мои баллы — мини-сводка */}
      {isStudent && <StudentBreakdown studentId={userId} />}

      {openFor && (
        <UploadModal
          criterion={openFor}
          studentId={userId}
          onClose={() => setOpenFor(null)}
          onSaved={() => setOpenFor(null)}
        />
      )}
      {preview && <PreviewModal sub={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}

/* ---------- Upload Modal ---------- */
function UploadModal({
  criterion,
  studentId,
  onClose,
  onSaved,
}: {
  criterion: Criterion;
  studentId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [note, setNote] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (files.length === 0) return alert("Fayl tanlang.");
    await createOrUpdateSubmission({ studentId, criterionId: criterion.id, note, files });
    alert("Yuborildi.");
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/20 p-3">
      <form onSubmit={submit} className="w-full max-w-lg space-y-3 rounded-2xl border bg-white p-4">
        <div className="text-lg font-semibold">{criterion.title}</div>
        {criterion.subtitle && (
          <div className="rounded-lg bg-neutral-50 p-3 text-sm">{criterion.subtitle}</div>
        )}
        <textarea
          className="w-full rounded-xl border px-3 py-2"
          rows={3}
          placeholder="Izoh (ixtiyoriy)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 hover:bg-neutral-50">
          <Upload className="h-4 w-4" />
          <span className="text-sm">Fayllarni tanlash</span>
          <input
            type="file"
            multiple
            className="hidden"
            onChange={(e) => setFiles(Array.from(e.target.files || []))}
          />
        </label>
        <div className="text-xs text-neutral-600">
          Tanlangan: {files.map((f) => f.name).join(", ") || "yo‘q"}
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl border px-4 py-2">
            Bekor
          </button>
          <button className="rounded-xl bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700">
            Yuborish
          </button>
        </div>
      </form>
    </div>
  );
}

/* ---------- Preview Modal ---------- */
function PreviewModal({ sub, onClose }: { sub: SocialSubmission; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-3">
      <div className="w-full max-w-2xl rounded-2xl border bg-white p-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-lg font-semibold">Hujjatlar</div>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-neutral-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-2">
          {sub.files.map((f) => (
            <details key={f.id} className="rounded-lg border">
              <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm">
                <Eye className="h-4 w-4" /> {f.name}{" "}
                <span className="text-xs text-neutral-500">
                  ({Math.round(f.size / 1024)} KB)
                </span>
              </summary>
              <div className="border-t p-3">
                {f.type.startsWith("image/") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={f.dataUrl} alt={f.name} className="max-h-96 rounded-lg border" />
                ) : f.type.includes("pdf") ? (
                  <iframe src={f.dataUrl} className="h-96 w-full rounded-lg border" />
                ) : (
                  <div className="text-sm text-neutral-600">
                    Ko‘rish imkoni yo‘q. Yuklab oling:{" "}
                    <a download={f.name} href={f.dataUrl} className="text-indigo-600 underline">
                      download
                    </a>
                  </div>
                )}
              </div>
            </details>
          ))}
          {sub.files.length === 0 && <div className="text-sm text-neutral-500">Fayllar yo‘q.</div>}
        </div>
      </div>
    </div>
  );
}

/* ---------- Review List ---------- */
function ReviewList({
  role,
  items,
  onPreview,
  onDecide,
}: {
  role: string;
  items: SocialSubmission[];
  onPreview: (s: SocialSubmission) => void;
  onDecide: (p: Parameters<typeof reviewSubmission>[0]) => void;
}) {
  const stageFilter = (s: SocialSubmission) => {
    if (role === "admin") return s.status !== "dean_approved" && s.status !== "rejected";
    if (role === "tutor") return s.status === "submitted";
    if (role === "deputy") return s.status === "tutor_approved";
    if (role === "dean") return s.status === "deputy_approved";
    return false;
  };
  const list = items.filter(stageFilter);
  const [scoreMap, setScoreMap] = useState<Record<string, number>>({});

  const actorRole = toModeratorRole(role);

  return (
    <div className="space-y-2">
      {list.map((s) => (
        <div
          key={s.id}
          className="flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">
              Student: {s.studentId} • Criterion #{s.criterionId}
            </div>
            <div className="text-xs text-neutral-600">
              Topshirildi: {new Date(s.createdAt).toLocaleString()}
            </div>
            {s.note && <div className="mt-1 text-xs text-neutral-700">Izoh: {s.note}</div>}
            <button
              onClick={() => onPreview(s)}
              className="mt-2 inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs hover:bg-neutral-50"
            >
              <Eye className="h-3 w-3" /> Hujjatlarni ko‘rish
            </button>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {(role === "tutor" || role === "admin") && (
              <input
                type="number"
                min={0}
                className="w-24 rounded-xl border px-2 py-1 text-sm"
                placeholder="Ball"
                value={scoreMap[s.id] ?? (s.tutorScore ?? 0)}
                onChange={(e) =>
                  setScoreMap((m) => ({ ...m, [s.id]: Number(e.target.value) }))
                }
                title="Ball"
              />
            )}
            <button
              onClick={() =>
                onDecide({
                  id: s.id,
                  actorRole,
                  decision: "approve",
                  score: scoreMap[s.id],
                })
              }
              className="inline-flex items-center gap-1 rounded-lg border-emerald-300 bg-emerald-50 px-3 py-1.5 text-sm text-emerald-700"
            >
              Tasdiqlash
            </button>
            <button
              onClick={() =>
                onDecide({
                  id: s.id,
                  actorRole,
                  decision: "reject",
                })
              }
              className="inline-flex items-center gap-1 rounded-lg border-rose-300 bg-rose-50 px-3 py-1.5 text-sm text-rose-700"
            >
              Rad etish
            </button>
          </div>
        </div>
      ))}
      {list.length === 0 && (
        <div className="text-sm text-neutral-500">Hozircha ko‘rib chiqiladigan arizalar yo‘q.</div>
      )}
    </div>
  );
}

/* ---------- Student Breakdown ---------- */
function StudentBreakdown({ studentId }: { studentId: string }) {
  const [items, setItems] = useState<ReturnType<typeof socialBreakdownFor>>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const reload = () => setItems(socialBreakdownFor(studentId));
    reload();

    const onStorage = (_ev: StorageEvent) => reload();
    const onSocial: EventListener = () => reload();

    window.addEventListener("storage", onStorage);
    window.addEventListener(SOCIAL_CHANGED, onSocial);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(SOCIAL_CHANGED, onSocial);
    };
  }, [studentId]);

  const total = items.reduce((s, it) => s + it.score, 0);
  const max = items.reduce((s, it) => s + it.criterion.maxScore, 0);

  return (
    <section className="rounded-2xl border bg-white p-4">
      <div className="mb-2 text-sm font-semibold">Mening ballarim</div>
      <div className="mb-3 rounded-xl bg-neutral-50 p-3 text-sm">
        Jami:{" "}
        <b suppressHydrationWarning>{mounted ? total : "–"}</b> /{" "}
        <span suppressHydrationWarning>{mounted ? max : "–"}</span>
      </div>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {items.map((it) => (
          <div key={it.criterion.id} className="rounded-xl border p-3">
            <div className="font-medium">{it.criterion.title}</div>
            <div className="mt-1 text-sm" suppressHydrationWarning>
              Ball: <b>{mounted ? it.score : "–"}</b> /
              <span> {mounted ? it.criterion.maxScore : "–"}</span>
            </div>
            <div className="text-xs text-neutral-600">
              Holat:{" "}
              {it.submission
                ? it.submission.status === "dean_approved"
                  ? "Tasdiqlandi"
                  : it.submission.status === "rejected"
                  ? "Rad etildi"
                  : "Jarayonda"
                : "Topshirilmagan"}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
