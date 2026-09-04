"use client";

import { useCallback, useEffect, useState } from "react";
import { venmoPayLink, WEEKLY_DUE } from "@/lib/pool";

interface PaymentDTO {
  id: string;
  playerId: string;
  weekId: string;
  amount: number;
  paid: boolean;
  paidDate: string | null;
  player: {
    id: string;
    name: string;
    venmoUsername: string | null;
    team: { id: string; name: string; abbreviation: string; logoUrl: string | null };
  };
}

interface PaymentsResponse {
  seasonYear: number;
  weekNumber: number;
  week: { id: string };
  payments: PaymentDTO[];
}

export default function PayPage() {
  const [seasonYear, setSeasonYear] = useState<number | null>(null);
  const [weekNumber, setWeekNumber] = useState<number | null>(null);
  const [payments, setPayments] = useState<PaymentDTO[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async (year?: number, week?: number) => {
    const params = new URLSearchParams();
    if (year != null) params.set("year", String(year));
    if (week != null) params.set("week", String(week));
    const res = await fetch(`/api/payments?${params.toString()}`, {
      cache: "no-store",
    });
    const data: PaymentsResponse = await res.json();
    setSeasonYear(data.seasonYear);
    setWeekNumber(data.weekNumber);
    setPayments(data.payments);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch-on-mount, setState happens after the await
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectWeek = (week: number) => {
    if (seasonYear == null) return;
    setLoading(true);
    load(seasonYear, week);
  };

  const changeWeek = (delta: number) => {
    if (seasonYear == null || weekNumber == null) return;
    const next = Math.min(Math.max(weekNumber + delta, 1), 18);
    setLoading(true);
    load(seasonYear, next);
  };

  const togglePaid = async (payment: PaymentDTO) => {
    setBusyId(payment.id);
    const next = !payment.paid;
    setPayments(
      (prev) =>
        prev?.map((p) =>
          p.id === payment.id
            ? { ...p, paid: next, paidDate: next ? new Date().toISOString() : null }
            : p
        ) ?? null
    );
    try {
      await fetch("/api/payments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: payment.playerId,
          weekId: payment.weekId,
          paid: next,
        }),
      });
    } finally {
      setBusyId(null);
    }
  };

  const paidCount = payments?.filter((p) => p.paid).length ?? 0;

  return (
    <div className="mx-auto max-w-lg px-4 py-4">
      <div className="mb-4 flex items-center justify-between gap-2">
        <button
          onClick={() => changeWeek(-1)}
          disabled={weekNumber == null || weekNumber <= 1}
          className="rounded-full border border-black/10 px-3 py-2 text-sm font-medium disabled:opacity-30 dark:border-white/10"
          aria-label="Previous week"
        >
          ←
        </button>
        <select
          value={weekNumber ?? ""}
          onChange={(e) => selectWeek(Number(e.target.value))}
          className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm font-semibold dark:border-white/10 dark:bg-neutral-900"
        >
          {Array.from({ length: 18 }, (_, i) => i + 1).map((w) => (
            <option key={w} value={w}>
              Week {w}
              {seasonYear ? ` — ${seasonYear}` : ""}
            </option>
          ))}
        </select>
        <button
          onClick={() => changeWeek(1)}
          disabled={weekNumber == null || weekNumber >= 18}
          className="rounded-full border border-black/10 px-3 py-2 text-sm font-medium disabled:opacity-30 dark:border-white/10"
          aria-label="Next week"
        >
          →
        </button>
      </div>

      {payments && (
        <div className="mb-4 text-center text-sm text-neutral-500">
          {paidCount}/{payments.length} paid this week
        </div>
      )}

      {loading && !payments ? (
        <div className="py-10 text-center text-sm text-neutral-500">
          Loading players...
        </div>
      ) : payments && payments.length === 0 ? (
        <div className="py-10 text-center text-sm text-neutral-500">
          No players set up yet. Add players in the Admin tab.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {payments?.map((p) => (
            <div
              key={p.id}
              className={`flex items-center justify-between gap-2 rounded-xl border p-3 shadow-sm ${
                p.paid
                  ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950"
                  : "border-black/10 bg-white dark:border-white/10 dark:bg-neutral-900"
              }`}
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{p.player.name}</div>
                <div className="truncate text-xs text-neutral-500">
                  {p.player.team.name}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {!p.paid && p.player.venmoUsername && (
                  <a
                    href={venmoPayLink({
                      username: p.player.venmoUsername,
                      amount: WEEKLY_DUE,
                      note: `NFL Pool Week ${weekNumber}`,
                    })}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full bg-[#3D95CE] px-3 py-1.5 text-xs font-bold text-white"
                  >
                    Pay Venmo
                  </a>
                )}
                <button
                  onClick={() => togglePaid(p)}
                  disabled={busyId === p.id}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold disabled:opacity-50 ${
                    p.paid
                      ? "bg-emerald-600 text-white"
                      : "border border-black/10 text-neutral-600 dark:border-white/10 dark:text-neutral-300"
                  }`}
                >
                  {p.paid ? "Paid ✓" : "Mark paid"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
