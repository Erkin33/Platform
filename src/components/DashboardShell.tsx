"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), []);

  return (
    <div className="flex">
      {/* Левый сайдбар (как в макете) */}
      <Sidebar open={open} onClose={() => setOpen(false)} />

      {/* Контентная колонка с отступом = фикс. ширина сайдбара на ≥md */}
      <div className="min-h-screen flex-1 md:pl-[250px]">
        {/* Topbar */}
        <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white">
          {/* Topbar уже содержит кнопку меню на мобиле и профиль/колокольчик */}
          <Topbar onMenu={() => setOpen((v) => !v)} />
        </header>

        {/* Центр (строго по макету ширина и отступы) */}
        <main className="mx-auto max-w-[1280px] px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
