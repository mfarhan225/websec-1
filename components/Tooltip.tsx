// components/Tooltip.tsx
"use client";

import { useEffect, useRef, useState, ReactNode } from "react";
import { createPortal } from "react-dom";

type Side = "top" | "bottom" | "left" | "right";

type TooltipProps = {
  /** Konten tooltip (teks pendek direkomendasikan) */
  content: ReactNode;
  /** Posisi tooltip relatif terhadap trigger (default: "right") */
  side?: Side;
  /** Delay tampil (ms) saat hover/focus (default: 300ms) */
  delay?: number;
  /** Elemen anak apa saja (ikon, tombol, dsb) */
  children: ReactNode;
};

export default function Tooltip({
  content,
  side = "right",
  delay = 300,
  children,
}: TooltipProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const triggerRef = useRef<HTMLSpanElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<number | undefined>(undefined);
  const id = "credense-tooltip";

  useEffect(() => setMounted(true), []);

  const clear = () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }
  };
  const show = () => {
    clear();
    timerRef.current = window.setTimeout(() => setOpen(true), delay);
  };
  const hide = () => {
    clear();
    setOpen(false);
  };

  // Hitung posisi tooltip saat tampil & ketika viewport berubah
  useEffect(() => {
    if (!open || !mounted) return;

    const update = () => {
      const t = triggerRef.current;
      const tt = tooltipRef.current;
      if (!t || !tt) return;

      const r = t.getBoundingClientRect();
      const ttRect = tt.getBoundingClientRect();
      const gap = 8;

      let top = 0;
      let left = 0;

      switch (side) {
        case "top":
          top = r.top - ttRect.height - gap;
          left = r.left + r.width / 2 - ttRect.width / 2;
          break;
        case "bottom":
          top = r.bottom + gap;
          left = r.left + r.width / 2 - ttRect.width / 2;
          break;
        case "left":
          top = r.top + r.height / 2 - ttRect.height / 2;
          left = r.left - ttRect.width - gap;
          break;
        case "right":
        default:
          top = r.top + r.height / 2 - ttRect.height / 2;
          left = r.right + gap;
          break;
      }

      // Clamp biar gak keluar layar
      const maxLeft = window.innerWidth - ttRect.width - 4;
      const maxTop = window.innerHeight - ttRect.height - 4;
      top = Math.max(4, Math.min(top, maxTop));
      left = Math.max(4, Math.min(left, maxLeft));

      setCoords({ top, left });
    };

    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open, mounted, side]);

  return (
    <>
      {/* Wrapper: pakai capture supaya fokus pada anak ikut terdeteksi */}
      <span
        ref={triggerRef}
        className="inline-flex items-center"
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocusCapture={show}
        onBlurCapture={hide}
        aria-describedby={open ? id : undefined}
      >
        {children}
      </span>

      {mounted && open &&
        createPortal(
          <div
            ref={tooltipRef}
            className="pointer-events-none fixed z-[9999] transition-all duration-100"
            style={{ top: coords.top, left: coords.left }}
          >
            <div
              id={id}
              role="tooltip"
              className="rounded-md border border-black/10 bg-neutral-900/95 px-2 py-1 text-xs font-medium text-white shadow-lg"
            >
              {content}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
