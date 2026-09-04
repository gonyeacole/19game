import { ApiSportsScoreProvider } from "./apisports";
import { EspnScoreProvider } from "./espn";
import type { ScoreProvider } from "./types";

// Swap this to change score data sources without touching sync or UI code —
// everything else depends only on ScoreProvider. Uses API-Sports when a key
// is configured (the real, deployed data source); falls back to the
// unofficial ESPN endpoint otherwise, which is enough to exercise the rest
// of the app locally even though it silently blocks server-side requests in
// production (see src/lib/scores/espn.ts).
const apiSportsKey = process.env.API_SPORTS_KEY;

export const scoreProvider: ScoreProvider = apiSportsKey
  ? new ApiSportsScoreProvider(apiSportsKey)
  : new EspnScoreProvider();

export * from "./types";
