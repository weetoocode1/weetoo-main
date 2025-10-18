"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  ChevronDown,
} from "lucide-react";

interface DatePickerProps {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
}

function pad(n: number) {
  return n < 10 ? `0${n}` : String(n);
}

export function DatePicker({ value, onChange }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => {
    const d = value || new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  // Initialize with today's date if no value is provided
  const didInitRef = useRef(false);
  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;
    if (!value) {
      onChange?.(new Date());
    }
  }, [value, onChange]);

  useEffect(() => {
    if (!value) return;
    setView({ year: value.getFullYear(), month: value.getMonth() });
  }, [value?.getFullYear(), value?.getMonth()]);

  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!open) return;
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const days = useMemo(() => {
    const first = new Date(view.year, view.month, 1);
    const startWeekday = first.getDay();
    const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
    const slots: (Date | null)[] = [];
    for (let i = 0; i < startWeekday; i++) slots.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      slots.push(new Date(view.year, view.month, d));
    }
    while (slots.length % 7 !== 0) slots.push(null);
    return slots;
  }, [view.year, view.month]);

  const label = useMemo(() => {
    if (!value) return "Select date";
    const y = value.getFullYear();
    const m = pad(value.getMonth() + 1);
    const d = pad(value.getDate());
    return `${y}-${m}-${d}`; // Korean standard: YYYY-MM-DD
  }, [value]);

  const prevMonth = () => {
    setView((v) => {
      const m = v.month - 1;
      if (m < 0) return { year: v.year - 1, month: 11 };
      return { year: v.year, month: m };
    });
  };
  const nextMonth = () => {
    setView((v) => {
      const m = v.month + 1;
      if (m > 11) return { year: v.year + 1, month: 0 };
      return { year: v.year, month: m };
    });
  };

  return (
    <div ref={containerRef} className="relative select-none">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full h-9 justify-between items-center inline-flex gap-2 px-3 border border-input rounded-md bg-background text-xs whitespace-nowrap"
      >
        <span className="flex items-center gap-2 text-muted-foreground">
          <CalendarDays className="w-4 h-4" /> {label}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-70 rounded-lg border border-border bg-popover/95 backdrop-blur-sm shadow-lg ring-1 ring-black/5">
          <div className="flex items-center justify-between px-2 py-2 gap-2">
            <button
              type="button"
              className="p-1 rounded hover:bg-muted transition-colors"
              onClick={prevMonth}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              <select
                className="text-sm !bg-background border border-input rounded px-2 py-1"
                value={view.month}
                onChange={(e) =>
                  setView((v) => ({
                    year: v.year,
                    month: Number(e.target.value),
                  }))
                }
              >
                {[
                  "Jan",
                  "Feb",
                  "Mar",
                  "Apr",
                  "May",
                  "Jun",
                  "Jul",
                  "Aug",
                  "Sep",
                  "Oct",
                  "Nov",
                  "Dec",
                ].map((m, idx) => (
                  <option key={m} value={idx} className="!bg-background">
                    {m}
                  </option>
                ))}
              </select>
              <select
                className="text-sm !bg-background border border-input rounded px-2 py-1"
                value={view.year}
                onChange={(e) =>
                  setView((v) => ({
                    year: Number(e.target.value),
                    month: v.month,
                  }))
                }
              >
                {(() => {
                  const now = new Date().getFullYear();
                  const ys: number[] = [];
                  for (let y = now - 10; y <= now + 10; y++) ys.push(y);
                  return ys;
                })().map((y) => (
                  <option key={y} value={y} className="!bg-background">
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              className="p-1 rounded hover:bg-muted transition-colors"
              onClick={nextMonth}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="px-2 pb-2">
            <div className="grid grid-cols-7 gap-1 text-[11px] text-muted-foreground mb-1">
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                <div key={d} className="text-center py-1">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {days.map((d, i) => (
                <button
                  type="button"
                  key={i}
                  disabled={!d}
                  onClick={() => {
                    onChange?.(d || undefined);
                    setOpen(false);
                  }}
                  className={
                    "h-8 text-sm rounded hover:bg-muted transition-colors aria-disabled:opacity-30 aria-disabled:cursor-default" +
                    (value && d && value.toDateString() === d.toDateString()
                      ? " bg-primary text-primary-foreground hover:bg-primary"
                      : "")
                  }
                >
                  {d ? d.getDate() : ""}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
