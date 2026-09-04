"use client";

import { useEffect, useState } from "react";

interface WinnerDTO {
  player: { id: string; name: string };
  team: { id: string; name: string; abbreviation: string };
  score: number;
}

interface PaymentRowDTO {
  playerId: string;
  playerName: string;
  amount: number;
  paid: boolean;
  paidDate: string | null;
}

interface WeekSummaryDTO {
  weekId: string;
  seasonYear: number;
  weekNumber: number;
  collected: number;
  rolloverIn: number;
  potBeforePayout: number;
  winners: WinnerDTO[];
  payoutPerWinner: number;
  paidOut: number;
  rolloverOut: number;
  complete: boolean;
  payments: PaymentRowDTO[];
}

interface PotResponse {
  seasonYear: number;
  weeks: WeekSummaryDTO[];
  summary: { totalCollected: number; totalPaidOut: number; currentPot: number };
}

function money(n: number): string {
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

function WeekCard({ week }: { week: WeekSummaryDTO }) {
  const [expanded, setExpanded] = useState(false);
  const paidCount = week.payments.filter((p) => p.paid).length;
  const unpaid = week.payments.filter((p) => !p.paid);

  return (
    <div className="rounded-xl border border-black/10 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-neutral-900">
      <div className="flex items-center justify-between">
        <div className="font-semibold">Week {week.weekNumber}</div>
        <div className="text-sm font-bold tabular-nums">
          {money(week.potBeforePayout)}
        </div>
      </div>

      <div className="mt-1 text-xs text-neutral-500">
        Collected {money(week.collected)} · Rollover in {money(week.rolloverIn)} ·{" "}
        {paidCount}/{week.payments.length} paid
      </div>

      <div className="mt-2">
        {!week.complete ? (
          <span className="inline-block rounded-full bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
            Games in progress — pot pending
          </span>
        ) : week.winners.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {week.winners.map((w) => (
              <span
                key={w.player.id + w.team.id}
                className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
              >
                🏆 {w.player.name} ({w.team.abbreviation}) won {money(week.payoutPerWinner)}
              </span>
            ))}
          </div>
        ) : (
          <span className="inline-block rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            No 19s — rolls over to next week
          </span>
        )}
      </div>

      <button
        onClick={() => setExpanded((e) => !e)}
        className="mt-2 text-xs font-medium text-neutral-500 underline underline-offset-2"
      >
        {expanded ? "Hide" : "Show"} payment status
      </button>

      {expanded && (
        <div className="mt-2 border-t border-black/5 pt-2 text-xs dark:border-white/10">
          {unpaid.length === 0 ? (
            <div className="text-emerald-600 dark:text-emerald-400">
              Everyone paid ✅
            </div>
          ) : (
            <div>
              <span className="font-medium text-neutral-500">Not paid: </span>
              {unpaid.map((p) => p.playerName).join(", ")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function PotPage() {
  const [data, setData] = useState<PotResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/pot", { cache: "no-store" })
      .then((res) => res.json())
      .then((d: PotResponse) => setData(d))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-lg px-4 py-4">
      <div className="mb-4 rounded-xl bg-emerald-600 p-5 text-center text-white shadow-sm">
        <div className="text-xs font-medium uppercase tracking-wide text-emerald-100">
          Current Pot
        </div>
        <div className="text-4xl font-extrabold tabular-nums">
          {data ? money(data.summary.currentPot) : "—"}
        </div>
      </div>

      {data && (
        <div className="mb-4 grid grid-cols-2 gap-3 text-center">
          <div className="rounded-xl border border-black/10 bg-white p-3 dark:border-white/10 dark:bg-neutral-900">
            <div className="text-xs text-neutral-500">Total Collected</div>
            <div className="text-lg font-bold tabular-nums">
              {money(data.summary.totalCollected)}
            </div>
          </div>
          <div className="rounded-xl border border-black/10 bg-white p-3 dark:border-white/10 dark:bg-neutral-900">
            <div className="text-xs text-neutral-500">Total Paid Out</div>
            <div className="text-lg font-bold tabular-nums">
              {money(data.summary.totalPaidOut)}
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-10 text-center text-sm text-neutral-500">
          Loading pot...
        </div>
      ) : !data || data.weeks.length === 0 ? (
        <div className="py-10 text-center text-sm text-neutral-500">
          No weeks tracked yet.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {[...data.weeks].reverse().map((w) => (
            <WeekCard key={w.weekId} week={w} />
          ))}
        </div>
      )}
    </div>
  );
}
