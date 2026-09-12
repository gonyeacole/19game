"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

const SEASON_WEEKS = Array.from({ length: 18 }, (_, i) => i + 1);

interface TeamDTO {
  id: string;
  name: string;
  abbreviation: string;
  logoUrl: string | null;
  player: { id: string; name: string } | null;
}

interface TeamResult {
  weekNumber: number;
  opponent: { abbreviation: string; name: string };
  isHome: boolean;
  teamScore: number;
  oppScore: number;
  status: "SCHEDULED" | "IN_PROGRESS" | "FINAL";
  statusDetail: string | null;
  hitNineteen: boolean;
}

function resultLabel(r: TeamResult): string {
  if (r.status === "SCHEDULED") return "—";
  return `${r.teamScore}-${r.oppScore}`;
}

function TeamRow({ team }: { team: TeamDTO }) {
  const [expanded, setExpanded] = useState(false);
  const [results, setResults] = useState<TeamResult[] | null>(null);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    const next = !expanded;
    setExpanded(next);
    if (next && !results) {
      setLoading(true);
      try {
        const res = await fetch(`/api/teams/${team.id}/results`, {
          cache: "no-store",
        });
        const data: { results: TeamResult[] } = await res.json();
        setResults(data.results);
      } finally {
        setLoading(false);
      }
    }
  };

  const byWeek = new Map(results?.map((r) => [r.weekNumber, r]) ?? []);

  return (
    <div className="rounded-xl border border-line bg-panel p-3">
      <button
        onClick={toggle}
        className="flex w-full items-center gap-2 text-left transition-transform active:scale-[0.99]"
      >
        {team.logoUrl ? (
          <Image src={team.logoUrl} alt="" width={28} height={28} unoptimized />
        ) : (
          <div className="h-7 w-7 shrink-0 rounded-full bg-panel-3" />
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-chalk">{team.name}</div>
          <div className="truncate text-xs text-chalk-faint">
            {team.player ? team.player.name : "Unassigned"}
          </div>
        </div>
        <span className="shrink-0 text-chalk-faint">{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className="mt-3 border-t border-line pt-2">
          {loading ? (
            <div className="py-4 text-center text-xs text-chalk-faint">Loading...</div>
          ) : (
            <div className="flex flex-col">
              {SEASON_WEEKS.map((wk) => {
                const r = byWeek.get(wk);
                return (
                  <div
                    key={wk}
                    className="flex items-center justify-between px-1 py-1 text-xs"
                  >
                    <span className="w-12 shrink-0 font-semibold text-chalk-faint">
                      Wk {wk}
                    </span>
                    {r ? (
                      <span
                        className={`flex-1 text-right ${
                          r.hitNineteen ? "font-bold text-led" : "text-chalk-dim"
                        }`}
                      >
                        {r.isHome ? "vs" : "@"} {r.opponent.abbreviation} {resultLabel(r)}
                      </span>
                    ) : (
                      <span className="flex-1 text-right text-chalk-faint">—</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function TeamsPage() {
  const [teams, setTeams] = useState<TeamDTO[] | null>(null);

  useEffect(() => {
    fetch("/api/teams", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: { teams: TeamDTO[] }) => setTeams(data.teams));
  }, []);

  return (
    <div className="mx-auto max-w-lg px-4 py-4">
      <div className="mb-4 text-center text-sm text-chalk-dim">
        Tap a team to see their results by week.
      </div>

      {!teams ? (
        <div className="py-10 text-center text-sm text-chalk-faint">Loading...</div>
      ) : (
        <div className="flex flex-col gap-2">
          {teams.map((t) => (
            <TeamRow key={t.id} team={t} />
          ))}
        </div>
      )}
    </div>
  );
}
