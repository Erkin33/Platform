"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ClipboardList, Clock, FileText, Plus, Save, Trash2, Pencil, Database, Upload, Shuffle } from "lucide-react";
import { getUser, type Role } from "@/lib/user";
import {
  getTests,
  addTest,
  updateTest,
  removeTest,
  TESTS_CHANGED,
  lastAttemptFor,
  getBanks,
  addBank,
  updateBank,
  removeBank,
  BANKS_CHANGED,
  parseCSVQuestions,
  sampleRandom,
  type TestItem,
  type Question,
  type QuestionBank
} from "@/lib/tests";

type NewBankQuestion = { text: string; a: string; b: string; c: string; d: string; correct: number };
type BuildMode = "single" | "mixed";

export default function TestsPage() {
  const [role, setRole] = useState<Role>("student");
  const [userId, setUserId] = useState<string>("current");
  const [tests, setTests] = useState<TestItem[]>([]);
  const [banks, setBanks] = useState<QuestionBank[]>([]);
  const [openCreateTest, setOpenCreateTest] = useState(false);
  const [openBank, setOpenBank] = useState(false);
  const [editingBank, setEditingBank] = useState<QuestionBank | null>(null);

  useEffect(() => {
  const u = getUser();
  setRole(u.role);
  setUserId(u.name || "current");

  const reload = () => setTests(getTests());
  const reloadBanks = () => setBanks(getBanks());

  reload();
  reloadBanks();

  const onTests: EventListener = () => reload();
  const onBanks: EventListener = () => reloadBanks();
  const onStorage = (_ev: StorageEvent) => { reload(); reloadBanks(); };

  window.addEventListener(TESTS_CHANGED, onTests);
  window.addEventListener(BANKS_CHANGED, onBanks);
  window.addEventListener("storage", onStorage);

  return () => {
    window.removeEventListener(TESTS_CHANGED, onTests);
    window.removeEventListener(BANKS_CHANGED, onBanks);
    window.removeEventListener("storage", onStorage);
  };
}, []);

  const visibleTests = useMemo(
    () => role === "admin" ? tests : tests.filter(t => t.status === "active"),
    [tests, role]
  );

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Testlar</h1>
        {role === "admin" && (
          <div className="flex gap-2">
            <button onClick={() => setOpenBank(true)} className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 hover:bg-neutral-50">
              <Database className="h-4 w-4" /> Savollar bazasi
            </button>
            <button onClick={() => setOpenCreateTest(true)} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700">
              <Plus className="h-4 w-4" /> Yangi test
            </button>
          </div>
        )}
      </div>

      <BanksPanel banks={banks} role={role} onEdit={(b)=>{setEditingBank(b); setOpenBank(true);}} onDelete={(id)=>removeBank(id)} />

      <div className="mt-6 space-y-4">
        {visibleTests.map((t) => {
          const last = lastAttemptFor(userId, t.id);
          return (
            <div key={t.id} className="rounded-2xl border bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[16px] font-semibold">{t.title}</div>
                  <div className="mt-1 text-[13px] text-neutral-600">{t.subject}</div>
                  <div className="mt-3 flex flex-wrap items-center gap-6 text-[12px] text-neutral-600">
                    <span className="inline-flex items-center gap-2"><FileText className="h-4 w-4" /> {t.questions.length} savol</span>
                    <span className="inline-flex items-center gap-2"><Clock className="h-4 w-4" /> {t.durationMin} daqiqa</span>
                    {last && <span className="inline-flex items-center gap-2 text-emerald-600"><ClipboardList className="h-4 w-4" /> Natija: {last.scorePercent}/100</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {role === "admin" && (
                    <>
                      <button className="rounded-xl border px-3 py-1.5 text-sm hover:bg-neutral-50" onClick={()=>updateTest(t.id,{status:t.status==="active"?"draft":"active"})}>Status: {t.status}</button>
                      <button className="rounded-xl border px-3 py-1.5 text-sm text-rose-600 hover:bg-rose-50" onClick={() => removeTest(t.id)}><Trash2 className="h-4 w-4" /></button>
                    </>
                  )}
                  <Link href={`/tests/${t.slug}`} className="rounded-xl px-4 py-2 text-sm bg-indigo-600 text-white hover:bg-indigo-700">
                    Boshlash
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
        {visibleTests.length === 0 && <div className="rounded-2xl border bg-white p-5 text-sm text-neutral-500">Hozircha testlar yo‘q.</div>}
      </div>

      {role==="admin" && openCreateTest && (
        <CreateTestModal
          banks={banks}
          onClose={()=>setOpenCreateTest(false)}
          onCreate={(payload)=>{ addTest(payload); setOpenCreateTest(false); }}
        />
      )}

      {role==="admin" && openBank && (
        <BankModal
          initial={editingBank ?? undefined}
          onClose={()=>{ setOpenBank(false); setEditingBank(null); }}
          onSave={(data, id)=>{
            if (id) updateBank(id, data);
            else addBank(data);
            setOpenBank(false); setEditingBank(null);
          }}
        />
      )}
    </div>
  );
}

function BanksPanel({ banks, role, onEdit, onDelete }: { banks: QuestionBank[]; role: Role; onEdit: (b: QuestionBank)=>void; onDelete:(id:string)=>void }) {
  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="mb-3 text-sm font-semibold">Savollar bazalari</div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {banks.map(b=>(
          <div key={b.id} className="rounded-xl border p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{b.title}</div>
                <div className="text-xs text-neutral-600">{b.subject}</div>
              </div>
              {role==="admin" && (
                <div className="flex gap-2">
                  <button className="rounded-md border px-2 py-1 text-xs hover:bg-neutral-50" onClick={()=>onEdit(b)}><Pencil className="h-3 w-3" /></button>
                  <button className="rounded-md border px-2 py-1 text-xs text-rose-600 hover:bg-rose-50" onClick={()=>onDelete(b.id)}><Trash2 className="h-3 w-3" /></button>
                </div>
              )}
            </div>
            <div className="mt-2 text-xs text-neutral-600">{b.questions.length} savol</div>
          </div>
        ))}
        {banks.length===0 && <div className="text-xs text-neutral-500">Bazalar yo‘q.</div>}
      </div>
    </div>
  );
}

function BankModal({ initial, onClose, onSave }: { initial?: QuestionBank; onClose:()=>void; onSave:(data: Omit<QuestionBank,"id"|"createdAt">, id?: string)=>void }) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [subject, setSubject] = useState(initial?.subject ?? "");
  const [list, setList] = useState<Question[]>(initial?.questions ?? []);
  const [q, setQ] = useState<NewBankQuestion>({ text: "", a: "", b: "", c: "", d: "", correct: 0 });
  function addOne() {
    const choices = [q.a, q.b, q.c, q.d].map(s=>s.trim()).filter(Boolean);
    if (!q.text.trim() || choices.length < 2) return;
    setList(s=>[...s, { id: Math.random().toString(36).slice(2,10), text: q.text.trim(), choices, correctIndex: Math.max(0, Math.min(choices.length-1, Number(q.correct))) }]);
    setQ({ text: "", a: "", b: "", c: "", d: "", correct: 0 });
  }
  async function importCSV(file: File) {
    const txt = await file.text();
    const qs = parseCSVQuestions(txt);
    if (qs.length === 0) return alert("CSV bo‘sh yoki noto‘g‘ri format.");
    setList(s=>[...s, ...qs]);
  }
  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !subject.trim() || list.length === 0) return;
    onSave({ title: title.trim(), subject: subject.trim(), questions: list }, initial?.id);
  }
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/20 p-3">
      <form onSubmit={submit} className="w-full max-w-3xl space-y-3 rounded-2xl border bg-white p-4">
        <div className="text-lg font-semibold">Savollar bazasi yaratish</div>
        <div className="grid gap-2 sm:grid-cols-2">
          <input className="rounded-xl border px-3 py-2" placeholder="Baza nomi" value={title} onChange={e=>setTitle(e.target.value)} required />
          <input className="rounded-xl border px-3 py-2" placeholder="Fan" value={subject} onChange={e=>setSubject(e.target.value)} required />
        </div>
        <div className="rounded-xl border p-3">
          <div className="mb-2 text-sm font-medium">CSVdan import</div>
          <div className="flex items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 hover:bg-neutral-50">
              <Upload className="h-4 w-4" />
              <span className="text-sm">CSV faylni tanlash</span>
              <input type="file" accept=".csv,text/csv,text/plain" className="hidden" onChange={e=>{ const f=e.target.files?.[0]; if(f) importCSV(f); }} />
            </label>
            <div className="text-xs text-neutral-500">Format: Savol;Variant1;Variant2;...;to‘g‘ri_index</div>
          </div>
        </div>
        <div className="rounded-xl border p-3">
          <div className="mb-2 text-sm font-medium">Qo‘lda savol qo‘shish</div>
          <div className="grid gap-2 sm:grid-cols-2">
            <input className="sm:col-span-2 rounded-xl border px-3 py-2" placeholder="Savol matni" value={q.text} onChange={e=>setQ(s=>({...s, text:e.target.value}))} />
            <input className="rounded-xl border px-3 py-2" placeholder="Variant 1" value={q.a} onChange={e=>setQ(s=>({...s, a:e.target.value}))} />
            <input className="rounded-xl border px-3 py-2" placeholder="Variant 2" value={q.b} onChange={e=>setQ(s=>({...s, b:e.target.value}))} />
            <input className="rounded-xl border px-3 py-2" placeholder="Variant 3" value={q.c} onChange={e=>setQ(s=>({...s, c:e.target.value}))} />
            <input className="rounded-xl border px-3 py-2" placeholder="Variant 4" value={q.d} onChange={e=>setQ(s=>({...s, d:e.target.value}))} />
            <input type="number" min={0} className="rounded-xl border px-3 py-2" placeholder="To‘g‘ri index (0..)" value={q.correct} onChange={e=>setQ(s=>({...s, correct:Number(e.target.value)}))} />
            <div className="sm:col-span-2">
              <button type="button" onClick={addOne} className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50">Savolni qo‘shish</button>
            </div>
          </div>
        </div>
        <div className="rounded-xl border p-3">
          <div className="mb-2 text-sm font-medium">Bazada {list.length} savol</div>
          <div className="max-h-60 overflow-auto rounded-lg border">
            {list.map((x, i)=>(
              <div key={x.id} className="flex items-center justify-between gap-2 border-b px-3 py-2 text-sm">
                <div className="truncate">{i+1}. {x.text}</div>
                <button type="button" className="rounded-md border px-2 py-1 text-xs hover:bg-neutral-50" onClick={()=>setList(s=>s.filter(q=>q.id!==x.id))}>O‘chirish</button>
              </div>
            ))}
            {list.length===0 && <div className="p-3 text-sm text-neutral-500">Savollar yo‘q</div>}
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl border px-4 py-2">Bekor qilish</button>
          <button className="inline-flex items-center gap-2 rounded-xl border px-4 py-2"><Save className="h-4 w-4" /> Saqlash</button>
        </div>
      </form>
    </div>
  );
}

function CreateTestModal({ banks, onClose, onCreate }: { banks: QuestionBank[]; onClose:()=>void; onCreate:(payload: Omit<TestItem,"id"|"slug"|"createdAt">)=>void }) {
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [duration, setDuration] = useState(60);
  const [status, setStatus] = useState<"active"|"draft">("active");
  const [mode, setMode] = useState<BuildMode>("single");
  const [bankId, setBankId] = useState(banks[0]?.id ?? "");
  const [count, setCount] = useState(20);
  const [mixed, setMixed] = useState<Record<string, number>>({});
  const [shuffle, setShuffle] = useState(true);

  function buildQuestions(): Question[] {
    if (mode === "single") {
      const b = banks.find(x=>x.id===bankId);
      if (!b) return [];
      const qs = sampleRandom(b.questions, count);
      return shuffle ? sampleRandom(qs, qs.length) : qs;
    } else {
      const res: Question[] = [];
      for (const b of banks) {
        const need = Number(mixed[b.id] || 0);
        if (need > 0) res.push(...sampleRandom(b.questions, need));
      }
      return shuffle ? sampleRandom(res, res.length) : res;
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const qs = buildQuestions();
    if (qs.length === 0) return alert("Savollar tanlanmadi.");
    onCreate({ title: title || "Yangi test", subject: subject || "Fan", durationMin: Number(duration)||60, status, questions: qs });
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/20 p-3">
      <form onSubmit={submit} className="w-full max-w-2xl space-y-3 rounded-2xl border bg-white p-4">
        <div className="text-lg font-semibold">Yangi test yaratish</div>
        <div className="grid gap-2 sm:grid-cols-2">
          <input className="rounded-xl border px-3 py-2" placeholder="Test nomi" value={title} onChange={e=>setTitle(e.target.value)} required />
          <input className="rounded-xl border px-3 py-2" placeholder="Fan nomi" value={subject} onChange={e=>setSubject(e.target.value)} required />
          <input type="number" min={5} className="rounded-xl border px-3 py-2" placeholder="Vaqt (daq.)" value={duration} onChange={e=>setDuration(Number(e.target.value))} />
          <select className="rounded-xl border px-3 py-2" value={status} onChange={e=>setStatus(e.target.value as "active"|"draft")}>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
          </select>
        </div>
        <div className="rounded-xl border p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-medium">Savollar tanlash</div>
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={shuffle} onChange={e=>setShuffle(e.target.checked)} />
              <Shuffle className="h-3 w-3" /> Tasodifiy aralashtirish
            </label>
          </div>
          <div className="mb-2 flex gap-2">
            <button type="button" onClick={()=>setMode("single")} className={`rounded-lg border px-3 py-1.5 text-sm ${mode==="single"?"bg-neutral-100":""}`}>Bitta baza</button>
            <button type="button" onClick={()=>setMode("mixed")} className={`rounded-lg border px-3 py-1.5 text-sm ${mode==="mixed"?"bg-neutral-100":""}`}>Bir nechta baza</button>
          </div>

          {mode==="single" ? (
            <div className="grid gap-2 sm:grid-cols-3">
              <select className="rounded-xl border px-3 py-2 sm:col-span-2" value={bankId} onChange={e=>setBankId(e.target.value)}>
                {banks.map(b=>(<option key={b.id} value={b.id}>{b.title} ({b.questions.length})</option>))}
              </select>
              <input type="number" min={1} className="rounded-xl border px-3 py-2" placeholder="Savollar soni" value={count} onChange={e=>setCount(Number(e.target.value))} />
            </div>
          ) : (
            <div className="space-y-2">
              {banks.map(b=>(
                <div key={b.id} className="grid grid-cols-5 items-center gap-2">
                  <div className="col-span-3 truncate text-sm">{b.title}</div>
                  <div className="text-xs text-neutral-500">{b.questions.length} ta</div>
                  <input type="number" min={0} className="rounded-xl border px-3 py-1.5" value={mixed[b.id] ?? 0} onChange={e=>setMixed(s=>({ ...s, [b.id]: Number(e.target.value) }))} />
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl border px-4 py-2">Bekor qilish</button>
          <button className="inline-flex items-center gap-2 rounded-xl border px-4 py-2"><Save className="h-4 w-4" /> Test yaratish</button>
        </div>
      </form>
    </div>
  );
}
