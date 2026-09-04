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
    <div className="rounded-xl border border-line bg-panel p-3">
      <div className="flex items-center justify-between">
        <div className="font-bold text-chalk">Week {week.weekNumber}</div>
        <div className="text-sm font-bold tabular-nums text-chalk">
          {money(week.potBeforePayout)}
        </div>
      </div>

      <div className="mt-1 text-xs text-chalk-faint">
        Collected {money(week.collected)} · Rollover in {money(week.rolloverIn)} ·{" "}
        {paidCount}/{week.payments.length} paid
      </div>

      <div className="mt-2">
        {!week.complete ? (
          <span className="inline-block rounded-full bg-panel-3 px-2.5 py-1 text-xs font-medium text-chalk-dim">
            Games in progress — pot pending
          </span>
        ) : week.winners.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {week.winners.map((w) => (
              <span
                key={w.player.id + w.team.id}
                className="inline-flex items-center gap-1 rounded-full bg-win-bg px-2.5 py-1 text-xs font-semibold text-win"
              >
                {w.player.name} ({w.team.abbreviation}) won {money(week.payoutPerWinner)}
              </span>
            ))}
          </div>
        ) : (
          <span className="inline-block rounded-full bg-caution-bg px-2.5 py-1 text-xs font-medium text-caution">
            No 19s — rolls over to next week
          </span>
        )}
      </div>

      <button
        onClick={() => setExpanded((e) => !e)}
        className="mt-2 text-xs font-medium text-chalk-faint underline underline-offset-2"
      >
        {expanded ? "Hide" : "Show"} payment status
      </button>

      {expanded && (
        <div className="mt-2 border-t border-line pt-2 text-xs">
          {unpaid.length === 0 ? (
            <div className="text-win">Everyone paid</div>
          ) : (
            <div className="text-chalk-dim">
              <span className="font-medium text-chalk-faint">Not paid: </span>
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
      <div className="mb-4 rounded-xl border border-line bg-gradient-to-br from-panel-3 to-panel p-5 text-center">
        <div className="text-xs font-semibold uppercase tracking-widest text-chalk-dim">
          Current Pot
        </div>
        <div className="text-4xl font-extrabold tabular-nums text-led drop-shadow-[0_0_20px_rgba(255,176,32,0.35)]">
          {data ? money(data.summary.currentPot) : "—"}
        </div>
      </div>

      {data && (
        <div className="mb-4 grid grid-cols-2 gap-3 text-center">
          <div className="rounded-xl border border-line bg-panel p-3">
            <div className="text-xs text-chalk-faint">Total Collected</div>
            <div className="text-lg font-bold tabular-nums text-chalk">
              {money(data.summary.totalCollected)}
            </div>
          </div>
          <div className="rounded-xl border border-line bg-panel p-3">
            <div className="text-xs text-chalk-faint">Total Paid Out</div>
            <div className="text-lg font-bold tabular-nums text-chalk">
              {money(data.summary.totalPaidOut)}
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-10 text-center text-sm text-chalk-faint">
          Loading pot...
        </div>
      ) : !data || data.weeks.length === 0 ? (
        <div className="py-10 text-center text-sm text-chalk-faint">
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
