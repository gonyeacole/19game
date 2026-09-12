import type { Game, Payment, Player, Team } from "@prisma/client";

export const WINNING_SCORE = 19;
export const WEEKLY_DUE = 10;

// Whoever collects/holds the pot — shown as a Venmo link on the Pot tab so
// anyone can pay in without needing to be looked up individually.
export const POT_VENMO_USERNAME = "Dan-woldo";

export type PaymentWithPlayerTeam = Payment & {
  player: Player & { team: Team };
};

export interface WeekWinner {
  player: Player;
  team: Team;
}

/** A week is "complete" once it has at least one game and every game is final. */
export function isWeekComplete(games: Game[]): boolean {
  return games.length > 0 && games.every((g) => g.status === "FINAL");
}

/**
 * Players the admin has manually confirmed as this week's winner(s). This is
 * a deliberate admin action (not derived from live scores) so payouts only
 * happen when someone actually confirms it.
 */
export function getWeekWinners(payments: PaymentWithPlayerTeam[]): WeekWinner[] {
  return payments
    .filter((p) => p.won)
    .map((p) => ({ player: p.player, team: p.player.team }));
}

export interface WeekPotSummary {
  weekId: string;
  seasonYear: number;
  weekNumber: number;
  collected: number;
  rolloverIn: number;
  potBeforePayout: number;
  winners: WeekWinner[];
  payoutPerWinner: number;
  paidOut: number;
  rolloverOut: number;
  complete: boolean;
}

/**
 * Walks weeks in chronological order computing each week's pot, applying
 * rollover from prior weeks with no confirmed winner, and figuring payouts.
 */
export function computeSeasonPot(
  weeks: {
    id: string;
    seasonYear: number;
    weekNumber: number;
    payments: PaymentWithPlayerTeam[];
    games: Game[];
  }[]
): WeekPotSummary[] {
  const sorted = [...weeks].sort(
    (a, b) => a.seasonYear - b.seasonYear || a.weekNumber - b.weekNumber
  );

  let rollover = 0;
  const summaries: WeekPotSummary[] = [];

  for (const week of sorted) {
    const collected = week.payments
      .filter((p) => p.paid)
      .reduce((sum, p) => sum + p.amount, 0);
    const potBeforePayout = collected + rollover;
    const complete = isWeekComplete(week.games);
    const winners = getWeekWinners(week.payments);

    let paidOut = 0;
    let payoutPerWinner = 0;
    let rolloverOut = rollover;

    if (winners.length > 0) {
      payoutPerWinner = potBeforePayout / winners.length;
      paidOut = potBeforePayout;
      rolloverOut = 0;
    } else {
      rolloverOut = potBeforePayout;
    }

    summaries.push({
      weekId: week.id,
      seasonYear: week.seasonYear,
      weekNumber: week.weekNumber,
      collected,
      rolloverIn: rollover,
      potBeforePayout,
      winners,
      payoutPerWinner,
      paidOut,
      rolloverOut,
      complete,
    });

    rollover = rolloverOut;
  }

  return summaries;
}

export interface SeasonSummary {
  totalCollected: number;
  totalPaidOut: number;
  currentPot: number;
}

export function computeSeasonSummary(weeks: WeekPotSummary[]): SeasonSummary {
  const totalCollected = weeks.reduce((sum, w) => sum + w.collected, 0);
  const totalPaidOut = weeks.reduce((sum, w) => sum + w.paidOut, 0);
  return {
    totalCollected,
    totalPaidOut,
    currentPot: totalCollected - totalPaidOut,
  };
}

export function venmoPayLink(params: {
  username: string;
  amount: number;
  note: string;
}): string {
  const { username, amount, note } = params;
  const search = new URLSearchParams({
    txn: "pay",
    amount: amount.toFixed(2),
    note,
  });
  return `https://venmo.com/${encodeURIComponent(username)}?${search.toString()}`;
}
