import { EspnScoreProvider } from "./espn";
import type { ScoreProvider } from "./types";

// Swap this line to change score data sources (e.g. a paid provider) without
// touching sync or UI code — everything else depends only on ScoreProvider.
export const scoreProvider: ScoreProvider = new EspnScoreProvider();

export * from "./types";
