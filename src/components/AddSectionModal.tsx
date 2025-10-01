"use client";

import { useEffect, useState } from "react";
import { addCustomNav, type CustomNavItem, type IconName } from "@/lib/nav";

const ICONS: IconName[] = [
  "FileText","Book","Users","Calendar","Award",
  "Settings","Briefcase","DollarSign","Clock","Star",
];

export default function AddSectionModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [form, setForm] = useState<CustomNavItem>({ id: "", title: "", icon: "FileText" });

  useEffect(() => {
    if (open) setForm({ id: "", title: "", icon: "FileText" });
  }, [open]);

  if (!open) return null;

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.id.trim() || !form.title.trim()) return;
    // нормализуем id: только буквы/цифры/подчёркивание
    const cleanId = form.id.trim().toLowerCase().replace(/[^\w]/g, "_");
    addCustomNav({ ...form, id: cleanId });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[60] grid place-content-center bg-black/30 p-4">
      <div className="w-[560px] max-w-full rounded-2xl border border-neutral-200 bg-white shadow-lg">
        <div className="border-b px-5 py-4 text-lg font-semibold">Yangi bo&apos;lim qo&apos;shish</div>
        <form onSubmit={onSubmit} className="px-5 py-5 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Bo&apos;lim ID <span className="text-rose-600">*</span></label>
            <input
              className="w-full rounded-xl border px-3 py-2 outline-none focus:border-indigo-500"
              placeholder="Masalan: yangi_bolim"
              value={form.id}
              onChange={(e) => setForm((s) => ({ ...s, id: e.target.value }))}
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Bo&apos;lim nomi <span className="text-rose-600">*</span></label>
            <input
              className="w-full rounded-xl border px-3 py-2 outline-none focus:border-indigo-500"
              placeholder="Masalan: Yangi bo'lim"
              value={form.title}
              onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Icon</label>
            <select
              className="w-full rounded-xl border px-3 py-2 outline-none focus:border-indigo-500"
              value={form.icon}
              onChange={(e) => setForm((s) => ({ ...s, icon: e.target.value as IconName }))}
            >
              {ICONS.map((i) => (
                <option key={i} value={i}>{i}</option>
              ))}
            </select>
          </div>

          <div className="mt-2 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="rounded-xl border px-4 py-2">
              Bekor qilish
            </button>
            <button type="submit" className="rounded-xl bg-indigo-600 px-5 py-2 font-medium text-white hover:bg-indigo-700">
              Qo&apos;shish
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
