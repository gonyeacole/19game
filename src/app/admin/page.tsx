"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";

interface TeamDTO {
  id: string;
  name: string;
  abbreviation: string;
  logoUrl: string | null;
  player: { id: string; name: string; venmoUsername: string | null } | null;
}

interface Draft {
  name: string;
  venmoUsername: string;
}

export default function AdminPage() {
  const [teams, setTeams] = useState<TeamDTO[] | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  const load = () =>
    fetch("/api/players", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: { teams: TeamDTO[] }) => {
        setTeams(data.teams);
        setDrafts((prev) => {
          const next = { ...prev };
          for (const team of data.teams) {
            if (!next[team.id]) {
              next[team.id] = {
                name: team.player?.name ?? "",
                venmoUsername: team.player?.venmoUsername ?? "",
              };
            }
          }
          return next;
        });
      });

  useEffect(() => {
    load();
  }, []);

  const assignedCount = useMemo(
    () => teams?.filter((t) => t.player).length ?? 0,
    [teams]
  );

  const updateDraft = (teamId: string, field: keyof Draft, value: string) => {
    setDrafts((prev) => ({
      ...prev,
      [teamId]: { ...prev[teamId], [field]: value },
    }));
  };

  const save = async (teamId: string) => {
    const draft = drafts[teamId];
    if (!draft?.name.trim()) return;
    setSavingId(teamId);
    try {
      await fetch("/api/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId,
          name: draft.name,
          venmoUsername: draft.venmoUsername || null,
        }),
      });
      await load();
      setSavedId(teamId);
      setTimeout(() => setSavedId((id) => (id === teamId ? null : id)), 1500);
    } finally {
      setSavingId(null);
    }
  };

  const clear = async (teamId: string) => {
    setSavingId(teamId);
    try {
      await fetch(`/api/players?teamId=${teamId}`, { method: "DELETE" });
      setDrafts((prev) => ({ ...prev, [teamId]: { name: "", venmoUsername: "" } }));
      await load();
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-4">
      <div className="mb-4 text-center">
        <h2 className="text-sm font-bold uppercase tracking-wide text-chalk">
          Player Setup
        </h2>
        <p className="mt-1 text-sm text-chalk-dim">
          Assign a player, name, and Venmo username to each of the 32 teams.{" "}
          <span className="font-semibold text-chalk">{assignedCount}/32 assigned.</span>
        </p>
      </div>

      {!teams ? (
        <div className="py-10 text-center text-sm text-chalk-faint">Loading...</div>
      ) : (
        <div className="flex flex-col gap-2">
          {teams.map((team) => {
            const draft = drafts[team.id] ?? { name: "", venmoUsername: "" };
            const dirty =
              draft.name !== (team.player?.name ?? "") ||
              draft.venmoUsername !== (team.player?.venmoUsername ?? "");
            return (
              <div
                key={team.id}
                className="rounded-xl border border-line bg-panel p-3"
              >
                <div className="mb-2 flex items-center gap-2">
                  {team.logoUrl ? (
                    <Image
                      src={team.logoUrl}
                      alt=""
                      width={24}
                      height={24}
                      unoptimized
                    />
                  ) : (
                    <div className="h-6 w-6 rounded-full bg-panel-3" />
                  )}
                  <span className="text-sm font-semibold text-chalk">{team.name}</span>
                  <span className="text-xs text-chalk-faint">
                    {team.abbreviation}
                  </span>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    value={draft.name}
                    onChange={(e) => updateDraft(team.id, "name", e.target.value)}
                    placeholder="Player name"
                    className="flex-1 rounded-lg border border-line bg-panel-2 px-2 py-1.5 text-sm text-chalk placeholder:text-chalk-faint"
                  />
                  <input
                    value={draft.venmoUsername}
                    onChange={(e) =>
                      updateDraft(team.id, "venmoUsername", e.target.value)
                    }
                    placeholder="Venmo username"
                    className="flex-1 rounded-lg border border-line bg-panel-2 px-2 py-1.5 text-sm text-chalk placeholder:text-chalk-faint"
                  />
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    onClick={() => save(team.id)}
                    disabled={!dirty || !draft.name.trim() || savingId === team.id}
                    className="rounded-full bg-win px-3 py-1.5 text-xs font-bold text-[#08150e] disabled:opacity-40"
                  >
                    {savingId === team.id ? "Saving..." : "Save"}
                  </button>
                  {team.player && (
                    <button
                      onClick={() => clear(team.id)}
                      disabled={savingId === team.id}
                      className="rounded-full border border-line px-3 py-1.5 text-xs font-medium text-chalk-dim"
                    >
                      Clear
                    </button>
                  )}
                  {savedId === team.id && (
                    <span className="text-xs font-medium text-win">
                      Saved ✓
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
