export type NormalizedGameStatus = "SCHEDULED" | "IN_PROGRESS" | "FINAL";

export interface NormalizedGame {
  providerGameId: string;
  homeTeamAbbr: string;
  awayTeamAbbr: string;
  homeScore: number;
  awayScore: number;
  status: NormalizedGameStatus;
  statusDetail: string;
  startTime: string; // ISO 8601
}

export interface ScoreboardParams {
  seasonYear: number;
  week: number;
  /** ESPN seasontype: 1 = preseason, 2 = regular season, 3 = postseason */
  seasonType?: number;
}

/**
 * Common interface for any NFL score data source. Implement this to swap in
 * a different provider (e.g. a paid API) without touching sync/UI code.
 */
export interface ScoreProvider {
  getWeekScoreboard(params: ScoreboardParams): Promise<NormalizedGame[]>;
}
