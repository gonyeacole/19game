import { ApiSportsScoreProvider } from "./apisports";
import { GoogleSheetScoreProvider } from "./sheet";
import type { ScoreProvider } from "./types";

// Swap this to change score data sources without touching sync or UI code —
// everything else depends only on ScoreProvider.
//
// Primary: a community-maintained Google Sheet that auto-refreshes live NFL
// scores (see sheet.ts) — free, no API key, and not subject to the
// server-side bot-filtering that blocks direct ESPN requests in production
// (see espn.ts, kept as a reference implementation but unused here).
// API-Sports is available if a key is set (its free tier excludes the
// current season, so this is mostly for a future paid upgrade).
const apiSportsKey = process.env.API_SPORTS_KEY;

export const scoreProvider: ScoreProvider = apiSportsKey
  ? new ApiSportsScoreProvider(apiSportsKey)
  : new GoogleSheetScoreProvider();

export * from "./types";
