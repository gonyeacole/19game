# Exactly 19 Pool

A mobile-friendly web app for a friend group's NFL "Exactly 19" pool: 32
players each permanently own one NFL team, everyone pays $10/week, and
whoever's team scores exactly 19 points that week wins the pot (split if
there's a tie, rolls over if nobody hits it).

## Stack

- **Next.js** (App Router, TypeScript, Tailwind CSS)
- **SQLite** via **Prisma**, using the libSQL driver adapter — a real
  shared backend, not local state. Talks to a local file in dev and to
  [Turso](https://turso.tech) (hosted, serverless-friendly SQLite) once
  `TURSO_DATABASE_URL`/`TURSO_AUTH_TOKEN` are set, so the same code runs
  locally and on Vercel
- Live scores from **[API-Sports](https://api-sports.io)'s American
  Football API** (free tier), behind a small provider abstraction
  (`src/lib/scores/`) so the data source can be swapped without touching
  sync or UI code. Falls back to ESPN's unofficial scoreboard endpoint
  when no `API_SPORTS_KEY` is set (works locally, but ESPN silently
  blocks server-originated requests in production)

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
- `Game` — synced from the active score provider per week, keyed by
  `espnGameId` (the provider-agnostic game id, despite the field name)
- `Payment` — `$10` due per player per week, `paid` boolean + timestamp

SQLite has no native enum support in Prisma, so `Game.status` is a
plain string constrained in application code to `SCHEDULED` /
`IN_PROGRESS` / `FINAL`.

## Swapping score providers

`src/lib/scores/types.ts` defines a `ScoreProvider` interface
(`getWeekScoreboard`). `src/lib/scores/apisports.ts` implements it against
API-Sports' American Football API, and `src/lib/scores/espn.ts`
implements it against ESPN's unofficial scoreboard endpoint as a local-dev
fallback. `src/lib/scores/index.ts` picks between them based on whether
`API_SPORTS_KEY` is set. To switch to a different provider (e.g. a paid
one like SportsData.io), implement the same interface and swap the export
there — `sync.ts` and every API route are written against the interface,
not any specific provider.

### API-Sports free-tier rate limiting

The free API-Sports tier caps out around 100 requests/day. The Scores tab
polls every 30 seconds while open, so `syncWeekScores` (in
`src/lib/scores/sync.ts`) throttles actual provider calls to once every 5
minutes per week, and skips calling the provider at all once every game in
a week is `FINAL`, serving cached DB data the rest of the time.

## Deploying (Vercel + Turso)

Vercel's servers don't have a persistent filesystem, so a plain SQLite
file won't survive between requests there — that's what the libSQL
adapter above solves. To deploy:

1. **Create a Turso database** — [turso.tech](https://turso.tech), free
   tier is plenty for a friend-group pool. Via their CLI:
   ```bash
   turso db create exactly19-pool
   turso db show exactly19-pool --url        # -> TURSO_DATABASE_URL
   turso db tokens create exactly19-pool     # -> TURSO_AUTH_TOKEN
   ```
2. **Apply the schema to it** — the migration SQL is already checked
   into `prisma/migrations/`, so either pipe it through the Turso CLI:
   ```bash
   turso db shell exactly19-pool < prisma/migrations/20260904143425_init/migration.sql
   ```
   or run `TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... npx prisma db push`
   locally, which applies the current schema directly.
3. **Seed it**: `TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... npm run db:seed`
4. **Import the repo into Vercel** (vercel.com → Add New → Project →
   pick this repo/branch) and add `TURSO_DATABASE_URL`,
   `TURSO_AUTH_TOKEN`, and `API_SPORTS_KEY` (from
   [dashboard.api-sports.io](https://dashboard.api-sports.io)) as
   environment variables in the Vercel project settings. No other config
   needed — Next.js deploys itself.

## Notes

- The `/api/scores` route re-syncs from the active score provider on
  every request, throttled per the rate-limiting note above. If that
  request fails, the API falls back to whatever is already in the
  database and flags `synced: false` so the UI can show a "couldn't
  refresh" notice instead of going blank.
- `prisma/dev.db` is gitignored — each environment gets its own local
  SQLite file, used automatically whenever `TURSO_DATABASE_URL` isn't
  set.
