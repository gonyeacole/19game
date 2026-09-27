// Primary brand color per team, keyed by the same abbreviation used
// throughout the app (see prisma/teams.ts). Used as the background for the
// Scores tab's team-color chips, so each is picked from that team's real
// palette but skewed toward its darkest variant (navy/black over a bright
// accent) so white logo/text on top always has enough contrast — a plain
// hex, not a recreation of the team's actual logo or trademarked design.
const TEAM_COLORS: Record<string, string> = {
  ARI: "#97233F",
  ATL: "#A71930",
  BAL: "#241773",
  BUF: "#00338D",
  CAR: "#0A2240",
  CHI: "#0B162A",
  CIN: "#000000",
  CLE: "#311D00",
  DAL: "#041E42",
  DEN: "#002244",
  DET: "#0076B6",
  GB: "#203731",
  HOU: "#03202F",
  IND: "#002C5F",
  JAX: "#006778",
  KC: "#E31837",
  LAC: "#002A5C",
  LAR: "#003594",
  LV: "#000000",
  MIA: "#00565F",
  MIN: "#4F2683",
  NE: "#002244",
  NO: "#101820",
  NYG: "#0B2265",
  NYJ: "#125740",
  PHI: "#004C54",
  PIT: "#101820",
  SEA: "#002244",
  SF: "#AA0000",
  TB: "#34302B",
  TEN: "#0C2340",
  WSH: "#5A1414",
};

const FALLBACK_COLOR = "#2b2f36";

export function teamColor(abbreviation: string): string {
  return TEAM_COLORS[abbreviation.toUpperCase()] ?? FALLBACK_COLOR;
}
