"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") || "/dashboard";

  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: userId.trim(), password }),
      });

      const json = await res.json().catch(() => null);
      if (!json?.ok) {
        setError(json?.error ?? `Login fehlgeschlagen (HTTP ${res.status})`);
        return;
      }

      router.replace(next);
    } catch (e: any) {
      setError(e?.message ?? "Login fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="text-2xl font-semibold">BRApool Login</div>
        <div className="text-sm opacity-70 mt-1">Melde dich mit UserID und Passwort an.</div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm">
            {error}
          </div>
        )}

        <div className="mt-5 space-y-4">
          <div>
            <div className="text-xs opacity-70 mb-1">UserID</div>
            <input
              className="w-full rounded-2xl border border-white/10 bg-white/5 p-3 text-sm"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              autoComplete="username"
            />
          </div>

          <div>
            <div className="text-xs opacity-70 mb-1">Passwort</div>
            <input
              className="w-full rounded-2xl border border-white/10 bg-white/5 p-3 text-sm"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              onKeyDown={(e) => {
                if (e.key === "Enter") void submit();
              }}
            />
          </div>

          <button
            className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm hover:bg-white/15 disabled:opacity-50"
            disabled={busy || !userId.trim() || !password}
            onClick={() => void submit()}
          >
            {busy ? "Anmelden…" : "Anmelden"}
          </button>
        </div>
      </div>
    </div>
  );
}