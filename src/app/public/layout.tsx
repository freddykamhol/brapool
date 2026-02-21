import MobileHeader from "@/app/components/MobileHeader";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <MobileHeader />
      <header className="sticky top-0 z-40 hidden border-b border-white/10 bg-zinc-950/72 backdrop-blur-xl md:block">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-center px-3 md:px-6 lg:px-10">
          <div className="flex items-center gap-3 text-center">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-white to-zinc-300 text-zinc-950 shadow-sm">
              <span className="text-sm font-semibold tracking-tight">BRA</span>
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-bold tracking-tight text-white">BRApool</div>
              <div className="truncate text-[11px] font-medium text-zinc-400">Waescheverwaltung • Inventar</div>
            </div>
          </div>
        </div>
      </header>
      <main className="min-w-0 flex-1 p-3 md:p-6 md:pb-6 lg:p-10">
        <div className="mx-auto w-full max-w-7xl rounded-3xl border border-border bg-surface/95 p-4 shadow-[0_16px_40px_rgba(29,78,216,0.08)] backdrop-blur-md dark:shadow-none md:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
