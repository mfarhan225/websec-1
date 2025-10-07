"use client";

import Link from "next/link";
import { ReactNode } from "react";

export type ActivityItem = {
  id: string;
  icon?: ReactNode;
  label: string;
  meta?: string;
  time?: string;
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
    <div className="sidebar-card p-3 text-xs" aria-label="Recent activity">
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
              className="rounded px-2 py-0.5 text-[11px] text-indigo-700 hover:bg-indigo-50
                         dark:text-indigo-300 dark:hover:bg-white/10"
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
                    {it.meta ? <span className="opacity-70"> — {it.meta}</span> : null}
                  </div>
                  {it.time ? <div className="text-[11px] opacity-60">{it.time} ago</div> : null}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
