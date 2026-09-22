/**
 * Approximate regular-season kickoff (Thursday after Labor Day) for a given
 * season year. Used both to default the week selector and to tell apart
 * preseason vs regular-season rows in data sources that reuse "Week N"
 * labels for both (see src/lib/scores/sheet.ts).
 */
export function regularSeasonKickoff(seasonYear: number): Date {
  const sept1 = new Date(seasonYear, 8, 1);
  const dayOfWeek = sept1.getDay(); // 0=Sun..6=Sat
  const daysToFirstMonday = (8 - dayOfWeek) % 7;
  const laborDay = new Date(seasonYear, 8, 1 + daysToFirstMonday);
  const kickoff = new Date(laborDay);
  kickoff.setDate(laborDay.getDate() + 3); // Thursday after Labor Day
  return kickoff;
}

/**
 * Best-effort "current NFL week" for defaulting the UI. NFL regular season
 * runs ~Sept through early Jan, week 1 kicking off the Thursday after
 * Labor Day. This is an approximation for defaulting the selector only —
 * users can always navigate to any week manually.
 */
export function getDefaultSeasonAndWeek(now: Date = new Date()): {
  seasonYear: number;
  week: number;
} {
  const month = now.getMonth(); // 0-indexed
  const year = now.getFullYear();

  // Jan/Feb: still finishing up last season (playoffs). Treat as that
  // season's final regular-season week.
  if (month <= 1) {
    return { seasonYear: year - 1, week: 18 };
  }

  // Mar - Aug: offseason, default to week 1 of the upcoming season.
  if (month <= 7) {
    return { seasonYear: year, week: 1 };
  }

  // Sept - Dec: estimate week number from an approximate season start
  // (first Thursday after Labor Day, i.e. first Thu of Sept that is on/after
  // the first Monday).
  const seasonYear = year;
  const kickoff = regularSeasonKickoff(seasonYear);

  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const msPerDay = 24 * 60 * 60 * 1000;
  // A week's games run kickoff (Thu) through Monday Night Football — so
  // the "current week" conventionally flips over on Tuesday, the day after
  // MNF wraps, not on the following Thursday when the next slate actually
  // kicks off. Shift the boundary two days earlier than a flat 7-day timer
  // from kickoff would put it, so Tue/Wed already count as the next week.
  const diff = now.getTime() - kickoff.getTime() + 2 * msPerDay;
  const week = diff < 0 ? 1 : Math.floor(diff / msPerWeek) + 1;

  return { seasonYear, week: Math.min(Math.max(week, 1), 18) };
}
