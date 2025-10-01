// src/app/tests/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { ClipboardList, Clock, FileText, Plus, Save, Trash2, Pencil } from "lucide-react";
import { getUser, type Role } from "@/lib/user";
import {
  getTests,
  addTest,
  updateTest,
  removeTest,
  TESTS_CHANGED,
  lastAttemptFor,
  type TestItem,
  type Question,
  uid,
} from "@/lib/tests";

/** Быстрый парсер: "Savol? | A;B;C;D | 2" */
function parseQuestions(text: string): Question[] {
  return text
    .split("\n")
    .map(l => l.trim())
    .filter(Boolean)
    .map(line => {
      const [q, options, correctStr] = line.split("|").map(s => s.trim());
      const choices = (options ?? "").split(";").map(s => s.trim()).filter(Boolean);
      const correctIndex = Math.max(0, Math.min(choices.length - 1, Number(correctStr ?? 0)));
      return { id: uid(), text: q, choices, correctIndex };
    })
    .filter(q => q.text && q.choices.length >= 2);
}

type NewTestForm = {
  title: string;
  subject: string;
  durationMin: number;
  status: "active" | "draft";
  textarea: string;
};

export default function TestsPage() {
  const [role, setRole] = useState<Role>("student");
  const [userId, setUserId] = useState<string>("current");
  const [tests, setTests] = useState<TestItem[]>([]);
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<TestItem | null>(null);

  const [form, setForm] = useState<NewTestForm>({
    title: "",
    subject: "",
    durationMin: 60,
    status: "active",
    textarea: "Savol? | A;B;C | 1",
  });

  useEffect(() => {
    const u = getUser();
    setRole(u.role);
    setUserId(u.name || "current");
    const reload = () => setTests(getTests());
    reload();
    window.addEventListener(TESTS_CHANGED, reload);
    window.addEventListener("storage", reload);
    return () => {
      window.removeEventListener(TESTS_CHANGED, reload);
      window.removeEventListener("storage", reload);
    };
  }, []);

  const activeTests = useMemo(() => tests.filter(t => t.status === "active"), [tests]);

  function submitCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      const questions = parseQuestions(form.textarea);
      addTest({
        title: form.title || "Yangi test",
        subject: form.subject || "Fan",
        durationMin: Number(form.durationMin) || 60,
        status: form.status,
        questions,
      });
      setOpenForm(false);
      setForm({ title: "", subject: "", durationMin: 60, status: "active", textarea: "" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Xatolik";
      alert(msg);
    }
  }

  function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    try {
      const questions = parseQuestions(form.textarea);
      if (questions.length > 0) {
        updateTest(editing.id, {
          title: form.title,
          subject: form.subject,
          durationMin: Number(form.durationMin),
          status: form.status,
          questions,
        });
      } else {
        updateTest(editing.id, {
          title: form.title,
          subject: form.subject,
          durationMin: Number(form.durationMin),
          status: form.status,
        });
      }
      setEditing(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Xatolik";
      alert(msg);
    }
  }

  function openEdit(t: TestItem) {
    setEditing(t);
    const lines = t.questions
      .map(q => `${q.text} | ${q.choices.join(";")} | ${q.correctIndex}`)
      .join("\n");
    setForm({
      title: t.title,
      subject: t.subject,
      durationMin: t.durationMin,
      status: t.status,
      textarea: lines,
    });
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Testlar</h1>
        {role === "admin" && (
          <button
            onClick={() => { setOpenForm(v => !v); setEditing(null); setForm({ title: "", subject: "", durationMin: 60, status: "active", textarea: "Savol? | A;B;C | 1" }); }}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" /> Yangi test
          </button>
        )}
      </div>

      {/* CREATE / EDIT FORM (admin) */}
      {role === "admin" && (openForm || editing) && (
        <form onSubmit={editing ? submitEdit : submitCreate} className="mb-6 grid gap-3 rounded-2xl border bg-white p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <input className="rounded-xl border px-3 py-2" placeholder="Sarlavha" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required />
            <input className="rounded-xl border px-3 py-2" placeholder="Fan (subject)" value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} required />
            <input type="number" min={5} className="rounded-xl border px-3 py-2" placeholder="Daqiqa" value={form.durationMin} onChange={(e) => setForm((f) => ({ ...f, durationMin: Number(e.target.value) }))} />
            <select className="rounded-xl border px-3 py-2" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as "active" | "draft" }))}>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Savollar (har qatorda):</label>
            <p className="mb-2 text-[12px] text-neutral-500">Format: <code>Savol? | A;B;C;D | to‘g‘ri index</code></p>
            <textarea rows={6} className="w-full rounded-xl border px-3 py-2" value={form.textarea} onChange={(e) => setForm((f) => ({ ...f, textarea: e.target.value }))} placeholder="Savollarni kiriting…" />
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" className="rounded-xl border px-4 py-2" onClick={() => { setOpenForm(false); setEditing(null); }}>Bekor qilish</button>
            <button className="inline-flex items-center gap-2 rounded-xl border px-4 py-2">
              <Save className="h-4 w-4" /> Saqlash
            </button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {activeTests.map((t) => {
          const last = lastAttemptFor(userId, t.id);
          return (
            <div key={t.id} className="rounded-2xl border bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[16px] font-semibold">{t.title}</div>
                  <div className="mt-1 text-[13px] text-neutral-600">{t.subject}</div>

                  <div className="mt-3 flex flex-wrap items-center gap-6 text-[12px] text-neutral-600">
                    <span className="inline-flex items-center gap-2">
                      <FileText className="h-4 w-4" /> {t.questions.length} savol
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <Clock className="h-4 w-4" /> {t.durationMin} daqiqa
                    </span>
                    {last && (
                      <span className="inline-flex items-center gap-2 text-emerald-600">
                        <ClipboardList className="h-4 w-4" />
                        Natija: {last.scorePercent}/100
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {role === "admin" && (
                    <>
                      <button className="rounded-xl border px-3 py-1.5 text-sm hover:bg-neutral-50" onClick={() => openEdit(t)}>
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button className="rounded-xl border px-3 py-1.5 text-sm text-rose-600 hover:bg-rose-50" onClick={() => removeTest(t.id)}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                  <a
                    href={`/tests/${t.slug}`}
                    className={`rounded-xl px-4 py-2 text-sm ${last ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-indigo-600 text-white hover:bg-indigo-700"}`}
                  >
                    {last ? "Natijalar" : "Boshlash"}
                  </a>
                </div>
              </div>
            </div>
          );
        })}
        {activeTests.length === 0 && (
          <div className="rounded-2xl border bg-white p-5 text-sm text-neutral-500">Hozircha testlar yo‘q.</div>
        )}
      </div>
    </div>
  );
}
