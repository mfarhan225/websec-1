"use client";

import Link from "next/link";
import { ReactNode } from "react";

export type ActivityItem = {
  id: string;
  icon?: ReactNode;     // emoji atau svg kecil
  label: string;        // ringkas
  meta?: string;        // mis. file/folder
  time?: string;        // mis. “2m”, “1h”
};

type Props = {
  items?: ActivityItem[];
  collapsed?: boolean;
};

const demoItems: ActivityItem[] = [
  { id: "a1", icon: "✅", label: "Signed NDA", meta: "Acme Corp", time: "2m" },
  { id: "a2", icon: "⬆️", label: "Uploaded 3 files", meta: "/Q3/Invoices", time: "25m" },
  { id: "a3", icon: "✏️", label: "Edited permissions", meta: "Finance", time: "1h" },
];

export default function SidebarActivity({ items = demoItems, collapsed = false }: Props) {
  const count = items.length;

  return (
    <div
      className="
        rounded-xl border p-3 text-xs backdrop-blur
        border-neutral-200 bg-white/90 text-neutral-800
        dark:border-white/20 dark:bg-white/10 dark:text-white/80
      "
      aria-label="Recent activity"
    >
      {collapsed ? (
        <div className="text-center">
          <span aria-hidden>🔔</span> <span className="font-medium">{count}</span>
        </div>
      ) : (
        <>
          <div className="mb-2 flex items-center justify-between">
            <span className="font-medium">Recent activity</span>
            <Link
              href="/audit"
              className="rounded px-2 py-0.5 text-[11px] text-indigo-700 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-white/10"
            >
              View all
            </Link>
          </div>

          <ul className="space-y-2">
            {items.slice(0, 4).map((it) => (
              <li key={it.id} className="flex items-start gap-2">
                <div className="mt-[1px] text-base leading-none">{it.icon ?? "•"}</div>
                <div className="min-w-0 flex-1">
                  <div className="truncate">
                    <span className="font-medium">{it.label}</span>
                    {it.meta ? <span className="text-neutral-500 dark:text-white/60"> — {it.meta}</span> : null}
                  </div>
                  {it.time ? (
                    <div className="text-[11px] text-neutral-500 dark:text-white/50">{it.time} ago</div>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
