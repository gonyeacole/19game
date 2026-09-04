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
      <div className="mb-4">
        <h2 className="text-base font-bold">Player Setup</h2>
        <p className="text-sm text-neutral-500">
          Assign a player, name, and Venmo username to each of the 32 teams.{" "}
          <span className="font-medium">{assignedCount}/32 assigned.</span>
        </p>
      </div>

      {!teams ? (
        <div className="py-10 text-center text-sm text-neutral-500">Loading...</div>
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
                className="rounded-xl border border-black/10 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-neutral-900"
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
                    <div className="h-6 w-6 rounded-full bg-neutral-200 dark:bg-neutral-800" />
                  )}
                  <span className="text-sm font-semibold">{team.name}</span>
                  <span className="text-xs text-neutral-400">
                    {team.abbreviation}
                  </span>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    value={draft.name}
                    onChange={(e) => updateDraft(team.id, "name", e.target.value)}
                    placeholder="Player name"
                    className="flex-1 rounded-lg border border-black/10 bg-transparent px-2 py-1.5 text-sm dark:border-white/10"
                  />
                  <input
                    value={draft.venmoUsername}
                    onChange={(e) =>
                      updateDraft(team.id, "venmoUsername", e.target.value)
                    }
                    placeholder="Venmo username"
                    className="flex-1 rounded-lg border border-black/10 bg-transparent px-2 py-1.5 text-sm dark:border-white/10"
                  />
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    onClick={() => save(team.id)}
                    disabled={!dirty || !draft.name.trim() || savingId === team.id}
                    className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40"
                  >
                    {savingId === team.id ? "Saving..." : "Save"}
                  </button>
                  {team.player && (
                    <button
                      onClick={() => clear(team.id)}
                      disabled={savingId === team.id}
                      className="rounded-full border border-black/10 px-3 py-1.5 text-xs font-medium text-neutral-500 dark:border-white/10"
                    >
                      Clear
                    </button>
                  )}
                  {savedId === team.id && (
                    <span className="text-xs font-medium text-emerald-600">
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
