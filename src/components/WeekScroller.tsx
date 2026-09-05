"use client";

import { useEffect, useRef } from "react";

const WEEKS = Array.from({ length: 18 }, (_, i) => i + 1);

export default function WeekScroller({
  weekNumber,
  onSelect,
}: {
  weekNumber: number | null;
  onSelect: (week: number) => void;
}) {
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [weekNumber]);

  return (
    <div
      className="no-scrollbar -mx-4 mb-3 overflow-x-auto px-4"
      style={{
        maskImage:
          "linear-gradient(to right, transparent, black 24px, black calc(100% - 24px), transparent)",
        WebkitMaskImage:
          "linear-gradient(to right, transparent, black 24px, black calc(100% - 24px), transparent)",
      }}
    >
      <div className="flex w-max gap-4 px-2 pb-1">
        {WEEKS.map((w) => (
          <button
            key={w}
            ref={w === weekNumber ? activeRef : undefined}
            onClick={() => onSelect(w)}
            className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
              w === weekNumber
                ? "border-transparent bg-led text-[#1a1200]"
                : "border-line bg-panel-3 text-chalk-dim"
            }`}
          >
            Week {w}
          </button>
        ))}
      </div>
    </div>
  );
}
