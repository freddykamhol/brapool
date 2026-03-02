"use client";

import Link from "next/link";
import { KeyRound } from "lucide-react";

export default function MobileHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-zinc-950/72 backdrop-blur-xl md:hidden">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-3">
        <div className="w-10" />
        <div className="flex items-center gap-3 text-center">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-white to-zinc-300 text-zinc-950 shadow-sm">
            <span className="text-sm font-semibold tracking-tight">BRA</span>
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-bold tracking-tight text-white">BRApool</div>
            <div className="truncate text-[11px] font-medium text-zinc-400">Waescheverwaltung • Inventar</div>
          </div>
        </div>
        <Link
          href="/passwort"
          aria-label="Passwort ändern"
          className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10"
        >
          <KeyRound className="h-5 w-5" />
        </Link>
      </div>
    </header>
  );
}
