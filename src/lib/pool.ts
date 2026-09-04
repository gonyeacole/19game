import type { Game, Payment, Player, Team } from "@prisma/client";

export const WINNING_SCORE = 19;
export const WEEKLY_DUE = 10;

export type GameWithTeams = Game & {
  homeTeam: Team & { player: Player | null };
  awayTeam: Team & { player: Player | null };
};

export interface WeekWinner {
  player: Player;
  team: Team;
  score: number;
}

/** A week is "complete" once it has at least one game and every game is final. */
export function isWeekComplete(games: Game[]): boolean {
  return games.length > 0 && games.every((g) => g.status === "FINAL");
}

/**
 * Players whose team's final score is exactly WINNING_SCORE that week.
 * Returns [] if the week isn't complete yet (undecided) or no one hit it.
 */
export function getWeekWinners(games: GameWithTeams[]): WeekWinner[] {
  if (!isWeekComplete(games)) return [];

  const winners: WeekWinner[] = [];
  for (const game of games) {
    if (game.homeScore === WINNING_SCORE && game.homeTeam.player) {
      winners.push({
        player: game.homeTeam.player,
        team: game.homeTeam,
        score: game.homeScore,
      });
    }
    if (game.awayScore === WINNING_SCORE && game.awayTeam.player) {
      winners.push({
        player: game.awayTeam.player,
        team: game.awayTeam,
        score: game.awayScore,
      });
    }
  }
  return winners;
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
 * rollover from prior weeks with no winner, and figuring payouts.
 */
export function computeSeasonPot(
  weeks: {
    id: string;
    seasonYear: number;
    weekNumber: number;
    payments: Payment[];
    games: GameWithTeams[];
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
    const winners = getWeekWinners(week.games);

    let paidOut = 0;
    let payoutPerWinner = 0;
    let rolloverOut = rollover;

    if (complete) {
      if (winners.length > 0) {
        payoutPerWinner = potBeforePayout / winners.length;
        paidOut = potBeforePayout;
        rolloverOut = 0;
      } else {
        rolloverOut = potBeforePayout;
      }
    } else {
      // Week undecided: nothing paid out yet, pot carries as pending.
      rolloverOut = rollover;
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
