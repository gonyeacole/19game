// The 32 NFL teams, keyed by their ESPN team id (stable identifiers used by
// the ESPN scoreboard API). Abbreviations match what ESPN returns in
// `competitors[].team.abbreviation`, which is how game sync matches teams.
export const NFL_TEAMS = [
  { espnId: "1", abbreviation: "ATL", name: "Atlanta Falcons" },
  { espnId: "2", abbreviation: "BUF", name: "Buffalo Bills" },
  { espnId: "3", abbreviation: "CHI", name: "Chicago Bears" },
  { espnId: "4", abbreviation: "CIN", name: "Cincinnati Bengals" },
  { espnId: "5", abbreviation: "CLE", name: "Cleveland Browns" },
  { espnId: "6", abbreviation: "DAL", name: "Dallas Cowboys" },
  { espnId: "7", abbreviation: "DEN", name: "Denver Broncos" },
  { espnId: "8", abbreviation: "DET", name: "Detroit Lions" },
  { espnId: "9", abbreviation: "GB", name: "Green Bay Packers" },
  { espnId: "10", abbreviation: "TEN", name: "Tennessee Titans" },
  { espnId: "11", abbreviation: "IND", name: "Indianapolis Colts" },
  { espnId: "12", abbreviation: "KC", name: "Kansas City Chiefs" },
  { espnId: "13", abbreviation: "LV", name: "Las Vegas Raiders" },
  { espnId: "14", abbreviation: "LAR", name: "Los Angeles Rams" },
  { espnId: "15", abbreviation: "MIA", name: "Miami Dolphins" },
  { espnId: "16", abbreviation: "MIN", name: "Minnesota Vikings" },
  { espnId: "17", abbreviation: "NE", name: "New England Patriots" },
  { espnId: "18", abbreviation: "NO", name: "New Orleans Saints" },
  { espnId: "19", abbreviation: "NYG", name: "New York Giants" },
  { espnId: "20", abbreviation: "NYJ", name: "New York Jets" },
  { espnId: "21", abbreviation: "PHI", name: "Philadelphia Eagles" },
  { espnId: "22", abbreviation: "ARI", name: "Arizona Cardinals" },
  { espnId: "23", abbreviation: "PIT", name: "Pittsburgh Steelers" },
  { espnId: "24", abbreviation: "LAC", name: "Los Angeles Chargers" },
  { espnId: "25", abbreviation: "SF", name: "San Francisco 49ers" },
  { espnId: "26", abbreviation: "SEA", name: "Seattle Seahawks" },
  { espnId: "27", abbreviation: "TB", name: "Tampa Bay Buccaneers" },
  { espnId: "28", abbreviation: "WSH", name: "Washington Commanders" },
  { espnId: "29", abbreviation: "CAR", name: "Carolina Panthers" },
  { espnId: "30", abbreviation: "JAX", name: "Jacksonville Jaguars" },
  { espnId: "33", abbreviation: "BAL", name: "Baltimore Ravens" },
  { espnId: "34", abbreviation: "HOU", name: "Houston Texans" },
] as const;

export function logoUrlFor(abbreviation: string): string {
  return `https://a.espncdn.com/i/teamlogos/nfl/500/${abbreviation.toLowerCase()}.png`;
}
