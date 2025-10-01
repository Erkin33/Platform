"use client";

import { useEffect, useState } from "react";
import NotificationBell from "@/components/NotificationBell";
import { getUser, saveUser, toggleRole, USER_CHANGED, type User } from "@/lib/user";
import { Menu } from "lucide-react";

/** Универсальный топбар для DashboardShell (вставь в header) */
export default function Topbar({
  onMenu,
}: {
  onMenu?: () => void;
}) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    setUser(getUser());
    const onUser = () => setUser(getUser());
    window.addEventListener(USER_CHANGED, onUser);
    window.addEventListener("storage", onUser);
    return () => {
      window.removeEventListener(USER_CHANGED, onUser);
      window.removeEventListener("storage", onUser);
    };
  }, []);

  if (!user) return null;

  function switchRole() {
    const next = toggleRole(); // вызывает USER_CHANGED
    setUser(next);
  }

  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-3">
        <button
          className="md:hidden rounded-xl border px-2 py-2"
          onClick={onMenu}
          aria-label="Toggle menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="hidden md:inline text-sm text-neutral-500">
          Content is user-generated and unverified.
        </span>
      </div>

      <div className="flex items-center gap-4">
        {/* Колокольчик с уведомлениями */}
        <NotificationBell />

        {/* Профиль */}
        <div className="hidden md:flex items-center gap-3">
          <span className="rounded-full bg-indigo-100 text-indigo-700 h-9 w-9 grid place-content-center font-semibold">
            {user.initials}
          </span>
          <div className="leading-tight">
            <div className="text-sm font-medium">{user.name}</div>
            <div className="text-[11px] text-neutral-500">
              {user.course} • {user.dept}
              <span className="ml-2 inline-flex items-center rounded bg-neutral-200 px-2 py-0.5 text-[10px] font-medium text-neutral-700">
                {user.role === "admin" ? "Admin" : "Student"}
              </span>
            </div>
          </div>
          {/* Переключатель роли */}
          <button
            onClick={switchRole}
            className="ml-2 rounded-xl border px-3 py-1.5 text-xs hover:bg-neutral-50"
            title="Admin ↔ Student"
          >
            {user.role === "admin" ? "Switch to Student" : "Switch to Admin"}
          </button>
        </div>
      </div>
    </div>
  );
}
