"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Read the field straight from the DOM at submit time rather than a
    // React-state mirror — mobile autofill/password-suggestion can update
    // the input's value without firing React's onChange, which left the
    // state (and the disabled-until-non-empty button) stuck out of sync.
    const password = new FormData(e.currentTarget).get("password");
    if (typeof password !== "string" || !password) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        setError("Incorrect password");
        return;
      }
      router.replace("/admin");
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-4 px-4 py-16">
      <h2 className="text-center text-sm font-bold uppercase tracking-wide text-chalk">
        Admin Access
      </h2>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <input
          type="password"
          name="password"
          placeholder="Password"
          autoFocus
          className="rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm text-chalk placeholder:text-chalk-faint"
        />
        {error && <p className="text-center text-xs text-live">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="rounded-full bg-led px-4 py-2 text-sm font-bold text-[#1a1200] transition-transform active:scale-95 disabled:opacity-40 disabled:active:scale-100"
        >
          {loading ? "Checking..." : "Unlock"}
        </button>
      </form>
    </div>
  );
}
