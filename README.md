# Exactly 19 Pool

A mobile-friendly web app for a friend group's NFL "Exactly 19" pool: 32
players each permanently own one NFL team, everyone pays $10/week, and
whoever's team scores exactly 19 points that week wins the pot (split if
there's a tie, rolls over if nobody hits it).

## Stack

- **Next.js** (App Router, TypeScript, Tailwind CSS)
- **SQLite** via **Prisma** — a real shared backend, not local state
- Live scores from **ESPN's public scoreboard API**, behind a small
  provider abstraction (`src/lib/scores/`) so a paid provider can be
  swapped in later without touching sync or UI code

## Getting started

```bash
npm install
npm run db:migrate   # creates prisma/dev.db and applies the schema
npm run db:seed       # seeds the 32 NFL teams (also runs automatically after db:migrate)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The app starts on the
**Scores** tab.

### First-time setup

Go to the **Admin** tab and, for each of the 32 teams, fill in the
player's name and Venmo username. No login is required — this is meant
for a small trusted group.

## How the pool logic works

- A team "wins" a week if its **final** score (regulation or overtime,
  once ESPN marks the game `FINAL`) equals exactly 19.
- A week's games must **all** be final before winners are declared —
  otherwise an in-progress game could still land on 19 after the pot
  page already called it.
- If multiple teams hit 19 in the same week, the pot splits evenly
  among their owners.
- If nobody hits 19, that week's collected money rolls into next
  week's pot.
- The pool math lives in `src/lib/pool.ts` (`computeSeasonPot`,
  `getWeekWinners`, etc.) and is covered by manual test fixtures — see
  git history for the seed script used to verify rollover and split-pot
  cases end-to-end.

## Data model (`prisma/schema.prisma`)

- `Team` — the 32 NFL teams, seeded from `prisma/teams.ts`
- `Player` — one player per team (`Player.teamId` is unique), with an
  optional Venmo username
- `Week` — `(seasonYear, weekNumber)`
- `Game` — synced from ESPN per week, keyed by `espnGameId`
- `Payment` — `$10` due per player per week, `paid` boolean + timestamp

SQLite has no native enum support in Prisma, so `Game.status` is a
plain string constrained in application code to `SCHEDULED` /
`IN_PROGRESS` / `FINAL`.

## Swapping score providers

`src/lib/scores/types.ts` defines a `ScoreProvider` interface
(`getWeekScoreboard`). `src/lib/scores/espn.ts` implements it against
ESPN's public scoreboard endpoint. To switch to a paid provider (e.g.
SportsData.io), implement the same interface and swap the export in
`src/lib/scores/index.ts` — `sync.ts` and every API route are written
against the interface, not ESPN specifically.

## Notes

- The `/api/scores` route re-syncs from ESPN on every request (using
  `cache: "no-store"`), so polling the Scores tab picks up live
  updates during game days. If the ESPN request fails, the API falls
  back to whatever is already in the database and flags `synced:
  false` so the UI can show a "couldn't refresh" notice instead of
  going blank.
- `prisma/dev.db` is gitignored — each environment gets its own local
  SQLite file. For a real deployment behind a single shared URL, point
  `DATABASE_URL` at a persisted volume (or swap the Prisma datasource
  for a hosted SQLite-compatible service like Turso/LibSQL).
