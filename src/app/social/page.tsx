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
  type Criterion,
  type SocialSubmission,
} from "@/lib/social";
import { getUser } from "@/lib/user";

type ModeratorRole = "tutor" | "deputy" | "dean" | "admin";
const toModeratorRole = (r: string): ModeratorRole =>
  (["tutor", "deputy", "dean", "admin"] as const).includes(r as ModeratorRole)
    ? (r as ModeratorRole)
    : "tutor";

export default function SocialPage() {
  const [role, setRole] = useState<string>("student");
  const [userId, setUserId] = useState<string>("current");
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [subs, setSubs] = useState<SocialSubmission[]>([]);
  const [mounted, setMounted] = useState(false);

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

    // ВАЖНО: второй аргумент — функция-слушатель, без кастов к string
    window.addEventListener(SOCIAL_CHANGED, onSocial);
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener(SOCIAL_CHANGED, onSocial);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const my = useMemo(
    () => (mounted ? getStudentSubmissions(userId) : []),
    [userId, mounted]
  );

  const isStudent = role === "student";
  const isTutor = role === "tutor" || role === "admin";
  const isDeputy = role === "deputy" || role === "admin";
  const isDean = role === "dean" || role === "admin";
  const isModerator = isTutor || isDeputy || isDean || role === "admin";

  const [openFor, setOpenFor] = useState<Criterion | null>(null);
  const [preview, setPreview] = useState<SocialSubmission | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Ijtimoiy faollik</h1>
      </div>

      {isStudent && (
        <section className="rounded-2xl border bg-white p-4">
          <div className="mb-3 text-sm font-semibold">
            Kriteriyalar bo‘yicha hujjat topshirish
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {criteria.map((c) => {
              const mine = my.find((s) => s.criterionId === c.id);
              const badge =
                mine?.status === "dean_approved"
                  ? "bg-emerald-100 text-emerald-800"
                  : mine?.status?.startsWith("tutor") ||
                    mine?.status?.startsWith("deputy")
                  ? "bg-amber-100 text-amber-800"
                  : mine?.status === "rejected"
                  ? "bg-rose-100 text-rose-800"
                  : "bg-neutral-100 text-neutral-700";
              const label =
                mine?.status === "dean_approved"
                  ? "Tasdiqlandi (dekan)"
                  : mine?.status === "deputy_approved"
                  ? "Dekan o‘rinbosar tasdiqladi"
                  : mine?.status === "tutor_approved"
                  ? "Tyutor tasdiqladi"
                  : mine?.status === "submitted"
                  ? "Ko‘rib chiqilmoqda"
                  : mine?.status === "rejected"
                  ? "Rad etildi"
                  : "Topshirilmagan";

              return (
                <div key={c.id} className="rounded-xl border p-3">
                  <div className="mb-1 flex items-center justify-between">
                    <div className="font-medium">{c.title}</div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] ${badge}`}
                    >
                      {label}
                    </span>
                  </div>
                  <div className="text-xs text-neutral-600">
                    Maksimal ball: {c.maxScore}
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
        <div className="text-lg font-semibold">Hujjat topshirish</div>
        <div className="rounded-lg bg-neutral-50 p-3 text-sm">
          <div className="font-medium">{criterion.title}</div>
          <div className="text-neutral-600">Maksimal ball: {criterion.maxScore}</div>
        </div>
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
                <span className="text-xs text-neutral-500">({Math.round(f.size / 1024)} KB)</span>
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
                onChange={(e) => setScoreMap((m) => ({ ...m, [s.id]: Number(e.target.value) }))}
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
        Jami: <b suppressHydrationWarning>{mounted ? total : "–"}</b>{" "}
        / <span suppressHydrationWarning>{mounted ? max : "–"}</span>
      </div>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {items.map((it) => (
          <div key={it.criterion.id} className="rounded-xl border p-3">
            <div className="font-medium">{it.criterion.title}</div>
            <div className="mt-1 text-sm">
              Ball: <b suppressHydrationWarning>{mounted ? it.score : "–"}</b>{" "}
              / <span suppressHydrationWarning>{mounted ? it.criterion.maxScore : "–"}</span>
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
