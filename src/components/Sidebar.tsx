"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Home,
  CalendarDays,
  ListChecks,
  BookOpen,
  Users as UsersIcon,
  BadgeDollarSign,
  CheckCircle,
  FileText,
  Book,
  Calendar,
  Award,
  Settings,
  Briefcase,
  DollarSign,
  Clock,
  Star,
  Plus,
} from "lucide-react";

import AddSectionModal from "@/components/AddSectionModal";
import { getCustomNav, type CustomNavItem } from "@/lib/nav";

/* ------------------------------------------------
   Карта иконок для кастомных разделов (lucide-react)
------------------------------------------------- */
const ICON_MAP = {
  FileText,
  Book,
  Users: UsersIcon,
  Calendar,
  Award,
  Settings,
  Briefcase,
  DollarSign,
  Clock,
  Star,
} as const;

type IconKey = keyof typeof ICON_MAP;

/* ------------------------------------------------
   Базовые пункты меню
------------------------------------------------- */
const BASE = [
  { href: "/", title: "Bosh sahifa", Icon: Home },
  { href: "/events", title: "Tadbirlar", Icon: CalendarDays },
  { href: "/tests", title: "Testlar", Icon: ListChecks },
  { href: "/books", title: "Kitoblar", Icon: BookOpen },
  { href: "/clubs", title: "Klublar", Icon: UsersIcon },
  { href: "/scholarships", title: "Stipendiya", Icon: BadgeDollarSign },
  { href: "/davomat", title: "Davomat", Icon: CheckCircle },
] as const;

/* ------------------------------------------------
   Компонент Sidebar
------------------------------------------------- */
export default function Sidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();

  const [custom, setCustom] = useState<CustomNavItem[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Роль читаем только в браузере (иначе SSR ругается на localStorage)
  useEffect(() => {
    (async () => {
      try {
        const { getUser } = await import("@/lib/user");
        setIsAdmin(getUser().role === "admin");
      } catch {
        setIsAdmin(false);
      }
    })();
  }, []);

  // Загружаем и следим за кастомными разделами из LocalStorage
  useEffect(() => {
    const load = () => setCustom(getCustomNav());
    load();

    const handler = (e: StorageEvent) => {
      if (e.key === "uniplatform_nav") load();
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  return (
    <>
      {/* overlay для мобилы */}
      <div
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity md:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />

      {/* сам сайдбар */}
      <aside
        className={`fixed left-0 top-0 z-50 h-screen w-[250px] shrink-0 border-r border-neutral-200 bg-white transition-transform md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* хедер */}
        <div className="flex h-[64px] items-center gap-2 border-b border-neutral-200 px-4">
          <div className="grid h-8 w-8 place-content-center rounded-lg bg-indigo-600 font-bold text-white">
            UP
          </div>
          <span className="text-[15px] font-semibold">UniPlatform</span>
        </div>

        {/* ссылки */}
        <nav className="p-2">
          {/* базовые */}
          {BASE.map(({ href, title, Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-[14px] font-medium ${
                  active
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-neutral-700 hover:bg-neutral-50"
                }`}
              >
                <Icon
                  className={`h-5 w-5 ${
                    active ? "text-indigo-600" : "text-neutral-500"
                  }`}
                />
                {title}
              </Link>
            );
          })}

          {/* кастомные разделы, добавленные админом */}
          {custom.map(({ id, title, icon }) => {
            const href = `/c/${id}`;
            const active = pathname === href;
            const IconCmp = ICON_MAP[(icon as IconKey) ?? "FileText"];
            return (
              <Link
                key={id}
                href={href}
                onClick={onClose}
                className={`mt-1 flex items-center gap-3 rounded-xl px-3 py-3 text-[14px] font-medium ${
                  active
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-neutral-700 hover:bg-neutral-50"
                }`}
              >
                <IconCmp
                  className={`h-5 w-5 ${
                    active ? "text-indigo-600" : "text-neutral-500"
                  }`}
                />
                {title}
              </Link>
            );
          })}

          {/* кнопка «+ Yangi bo'lim qo'shish» — видна только Admin */}
          {isAdmin && (
            <button
              onClick={() => setShowAdd(true)}
              className="mt-3 flex w-full items-center gap-2 rounded-2xl border-2 border-dashed border-neutral-300 px-3 py-3 text-left text-[14px] text-neutral-700 hover:bg-neutral-50"
            >
              <Plus className="h-5 w-5" />
              Yangi bo&apos;lim qo&apos;shish
            </button>
          )}
        </nav>
      </aside>

      {/* модалка добавления */}
      <AddSectionModal open={showAdd} onClose={() => setShowAdd(false)} />
    </>
  );
}
