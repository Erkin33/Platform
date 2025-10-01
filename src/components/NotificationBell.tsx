"use client";

import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import {
  getNotifications,
  unreadCount,
  markAllRead,
  clearNotifications,
  removeNotification,
  NOTIF_CHANGED,
  type NotificationItem,
} from "@/lib/user";

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [count, setCount] = useState(0);

  const load = () => {
    setItems(getNotifications());
    setCount(unreadCount());
  };

  useEffect(() => {
    load();
    const onChange = () => load();
    window.addEventListener(NOTIF_CHANGED, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(NOTIF_CHANGED, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      markAllRead(); // открыли — считаем просмотренным
    }
  }

  return (
    <div className="relative">
      <button
        className="relative rounded-xl border p-2 hover:bg-neutral-50"
        aria-label="Notifications"
        onClick={toggle}
      >
        <Bell className="h-5 w-5" />
        {count > 0 ? (
          <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-content-center rounded-full bg-rose-500 px-1 text-[10px] font-medium text-white">
            {count > 9 ? "9+" : count}
          </span>
        ) : (
          items.length > 0 && (
            <span className="absolute -right-1 -top-1 grid h-4 w-4 place-content-center rounded-full bg-neutral-300 text-[10px] font-bold text-white">
              !
            </span>
          )
        )}
      </button>

      {/* dropdown */}
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[320px] overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b px-4 py-2">
            <div className="text-sm font-semibold">Upozhnomalar</div>
            {items.length > 0 && (
              <button
                onClick={() => clearNotifications()}
                className="rounded-lg border px-2 py-1 text-[11px] hover:bg-neutral-50"
                title="Tozalash"
              >
                Tozalash
              </button>
            )}
          </div>

          <div className="max-h-[320px] overflow-auto p-2">
            {items.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-neutral-500">
                Hozircha hech narsa yo‘q
              </div>
            ) : (
              items.map((n) => (
                <div
                  key={n.id}
                  className={`relative rounded-xl px-3 py-2 text-sm ${
                    n.read ? "bg-white" : "bg-amber-50"
                  }`}
                >
                  <button
                    onClick={() => removeNotification(n.id)}
                    className="absolute right-2 top-2 rounded-md p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
                    title="O‘chirish"
                    aria-label="Delete notification"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>

                  <div className="font-medium pr-6">{n.title}</div>
                  {n.subtitle && (
                    <div className="text-[12px] text-neutral-500">{n.subtitle}</div>
                  )}
                  <div className="mt-0.5 text-[11px] text-neutral-400">
                    {new Date(n.createdAt).toLocaleString("uz-UZ")}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
