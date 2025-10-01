"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), []);

  return (
    <div className="flex">
      {/* Левый сайдбар */}
      <Sidebar open={open} onClose={() => setOpen(false)} />

      {/* Контентная колонка с отступом под фикс-ширину сайдбара */}
      <div className="min-h-screen flex-1 md:pl-[250px]">
        {/* Topbar */}
        <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white">
          <Topbar onMenu={() => setOpen((v) => !v)} />
        </header>

        {/* Центр — как в макете */}
        <main className="mx-auto max-w-[1280px] px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
