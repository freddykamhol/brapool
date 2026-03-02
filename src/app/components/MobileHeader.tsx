"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { KeyRound, LogOut, UserRound } from "lucide-react";

function initialsFromName(name: string) {
  const cleaned = name.trim();
  if (!cleaned) return "??";
  const parts = cleaned.split(/\s+/g).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function colorIndex(seed: string, mod: number) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return mod ? hash % mod : 0;
}

const AVATAR_COLORS = [
  "from-rose-500 to-pink-600",
  "from-amber-500 to-orange-600",
  "from-emerald-500 to-teal-600",
  "from-sky-500 to-blue-600",
  "from-indigo-500 to-violet-600",
  "from-fuchsia-500 to-purple-600",
  "from-cyan-500 to-sky-600",
  "from-lime-500 to-green-600",
];

export default function MobileHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [sessionName, setSessionName] = useState("");
  const [sessionUserId, setSessionUserId] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadMe() {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (cancelled) return;
      if (json?.ok && json?.session) {
        setSessionName(typeof json.session.name === "string" ? json.session.name : "");
        setSessionUserId(typeof json.session.userId === "string" ? json.session.userId : "");
      }
    }
    void loadMe();
    return () => {
      cancelled = true;
    };
  }, []);

  const seed = sessionUserId || sessionName || "user";
  const avatarClass = useMemo(
    () => AVATAR_COLORS[colorIndex(seed, AVATAR_COLORS.length)],
    [seed],
  );
  const initials = useMemo(
    () => initialsFromName(sessionName || sessionUserId || "User"),
    [sessionName, sessionUserId],
  );

  async function logout() {
    if (logoutBusy) return;
    setLogoutBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      const next = encodeURIComponent(
        typeof window !== "undefined" ? `${window.location.pathname}${window.location.search}` : "/dashboard",
      );
      window.location.href = `/login?next=${next}`;
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-zinc-950/72 backdrop-blur-xl md:hidden">
      <div className="mx-auto relative flex h-16 w-full max-w-7xl items-center justify-between px-3">
        <div className="w-10" />
        <div className="flex items-center gap-3 text-center">
          <div className="relative h-10 w-10 overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-sm">
            <Image
              src="/logo-rettungswache-brakel2.png"
              alt="Rettungswache Brakel Logo"
              fill
              sizes="40px"
              className="object-cover"
              priority
            />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-bold tracking-tight text-white">BRApool</div>
            <div className="truncate text-[11px] font-medium text-zinc-400">Wäscheverwaltung • Inventar</div>
          </div>
        </div>

        <button
          aria-label="Konto"
          className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10"
          onClick={() => setMenuOpen((v) => !v)}
        >
          <div className={`grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br text-white ${avatarClass}`}>
            <span className="text-[10px] font-semibold tracking-tight">{initials}</span>
          </div>
        </button>
      </div>

      {menuOpen && (
        <>
          <button
            aria-label="Menü schließen"
            className="fixed inset-0 z-40 bg-transparent"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute right-3 top-[62px] z-50 w-[260px] rounded-2xl border border-white/10 bg-zinc-950/95 p-2 shadow-[0_18px_40px_rgba(2,6,23,0.55)] backdrop-blur-xl">
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
              <div className={`grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br text-white ${avatarClass}`}>
                <span className="text-xs font-semibold tracking-tight">{initials}</span>
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-zinc-100">{sessionName || "Angemeldet"}</div>
                <div className="truncate text-xs text-zinc-400">{sessionUserId || "User"}</div>
              </div>
            </div>

            <Link
              href="/passwort"
              className="mt-2 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-100 hover:bg-white/10"
              onClick={() => setMenuOpen(false)}
            >
              <KeyRound className="h-4 w-4" />
              Passwort ändern
            </Link>

            <button
              className="mt-2 flex w-full items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-100 hover:bg-white/10 disabled:opacity-50"
              onClick={() => void logout()}
              disabled={logoutBusy}
            >
              <LogOut className="h-4 w-4" />
              {logoutBusy ? "Abmelden..." : "Abmelden"}
            </button>

            {!sessionName && (
              <div className="mt-2 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-400">
                <UserRound className="h-3.5 w-3.5" />
                Konto-Info nicht verfügbar
              </div>
            )}
          </div>
        </>
      )}
    </header>
  );
}
