"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginContent() {
  const router = useRouter();
  const sp = useSearchParams();
  const requestedNext = sp.get("next");
  const next =
    requestedNext && requestedNext.startsWith("/") && !requestedNext.startsWith("//")
      ? requestedNext
      : "/dashboard";

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
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Login fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden p-4 sm:p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(148,163,184,0.18),transparent_42%),radial-gradient(circle_at_85%_12%,rgba(71,85,105,0.24),transparent_44%)]" />
      <div className="relative mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-5xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-3xl border border-white/[0.12] bg-zinc-950/78 shadow-[0_28px_90px_rgba(2,6,23,0.6)] backdrop-blur-2xl lg:grid-cols-2">
          <section className="hidden border-r border-white/10 p-10 lg:block">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-white to-zinc-300 text-zinc-950 shadow-sm">
                <span className="text-base font-semibold tracking-tight">BRA</span>
              </div>
              <div>
                <div className="text-xl font-bold tracking-tight text-white">BRApool</div>
                <div className="text-xs text-zinc-400">Wäscheverwaltung</div>
              </div>
            </div>
            <div className="mt-10 text-3xl font-semibold leading-tight text-white">
              Zugang für
              <br />
                Administratoren
            </div>
            <div className="mt-4 max-w-sm text-sm text-zinc-400">
              Melde dich mit deiner UserID an. Nach 30 Minuten Inaktivität wirst du automatisch abgemeldet.
            </div>
          </section>
          <section className="p-6 sm:p-8 md:p-10">
            <div className="mb-6 flex items-center gap-3 lg:hidden">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-white to-zinc-300 text-zinc-950 shadow-sm">
                <span className="text-sm font-semibold tracking-tight">BRA</span>
              </div>
              <div>
                <div className="text-lg font-semibold tracking-tight text-white">BRApool Login</div>
                <div className="text-xs text-zinc-400">Wäscheverwaltung</div>
              </div>
            </div>
            <div className="hidden text-2xl font-semibold tracking-tight text-white lg:block">Anmeldung</div>
            <div className="mt-1 text-sm text-zinc-400">Melde dich mit UserID und Passwort an.</div>

            {error && (
              <div className="mt-4 rounded-xl border border-red-500/35 bg-red-500/10 p-3 text-sm text-red-100">
                {error}
              </div>
            )}

            <form
              className="mt-6 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                void submit();
              }}
            >
              <div>
                <div className="mb-1 text-xs text-zinc-400">UserID</div>
                <input
                  className="w-full rounded-2xl border border-white/[0.12] bg-white/[0.06] p-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-white/30 focus:bg-white/[0.08] focus:ring-2 focus:ring-white/10"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  autoComplete="username"
                  placeholder="z.B. m.mustermann"
                />
              </div>

              <div>
                <div className="mb-1 text-xs text-zinc-400">Passwort</div>
                <input
                  className="w-full rounded-2xl border border-white/[0.12] bg-white/[0.06] p-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-white/30 focus:bg-white/[0.08] focus:ring-2 focus:ring-white/10"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>

              <button
                type="submit"
                className="mt-2 w-full rounded-xl border border-white/20 bg-white/[0.12] px-4 py-3 text-sm font-medium text-white transition hover:bg-white/[0.18] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={busy || !userId.trim() || !password}
              >
                {busy ? "Anmelden..." : "Anmelden"}
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950" />}>
      <LoginContent />
    </Suspense>
  );
}
