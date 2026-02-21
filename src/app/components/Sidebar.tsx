"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import {
  LayoutDashboard,
  PackagePlus,
  ArrowRightLeft,
  Database,
  Users,
  ChevronLeft,
} from "lucide-react";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
};

const NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, description: "Uebersicht & Hinweise" },
  { label: "Einlagern", href: "/einlagern", icon: PackagePlus, description: "In Bestand aufnehmen" },
  { label: "Ausgeben", href: "/ausgeben", icon: ArrowRightLeft, description: "Umlauf / Uebergabe" },
  { label: "Datenbank", href: "/datenbank", icon: Database, description: "Alle Eintraege" },
  { label: "Benutzer", href: "/benutzer", icon: Users, description: "Accounts & Rollen" },
];

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function isActivePath(pathname: string, href: string) {
  return pathname === href || (href !== "/dashboard" && pathname.startsWith(href + "/"));
}

export default function Sidebar() {
  const pathname = usePathname();
  const collapsed = useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === "undefined") return () => {};
      const handler = () => onStoreChange();
      window.addEventListener("storage", handler);
      window.addEventListener("brapool-sidebar", handler);
      return () => {
        window.removeEventListener("storage", handler);
        window.removeEventListener("brapool-sidebar", handler);
      };
    },
    () => {
      if (typeof window === "undefined") return false;
      return window.localStorage.getItem("brapool.sidebar") === "collapsed";
    },
    () => false
  );

  const setCollapsed = (next: boolean | ((current: boolean) => boolean)) => {
    if (typeof window === "undefined") return;
    const nextValue = typeof next === "function" ? next(collapsed) : next;
    window.localStorage.setItem("brapool.sidebar", nextValue ? "collapsed" : "expanded");
    window.dispatchEvent(new Event("brapool-sidebar"));
  };

  return (
    <aside
      className={cx(
        "sticky top-0 hidden h-screen border-r border-border bg-surface backdrop-blur-xl md:block",
        "transition-[width] duration-300 ease-out",
        collapsed ? "w-[88px]" : "w-[296px]"
      )}
    >
      <div className="flex h-full flex-col">
        <div className={cx("px-4 pt-4", collapsed ? "pb-3" : "pb-4")}>
          <div
            className={cx(
              "relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/5",
              collapsed ? "mx-auto grid h-[56px] w-[56px] place-items-center" : "p-4"
            )}
          >
            {collapsed ? (
              <div
                className={cx(
                  "grid h-11 w-11 place-items-center rounded-2xl shadow-sm",
                  "bg-gradient-to-br from-slate-900 to-slate-700 text-white",
                  "dark:from-white dark:to-zinc-300 dark:text-zinc-950"
                )}
              >
                <span className="text-xs font-semibold tracking-tight">BRA</span>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div
                  className={cx(
                    "grid h-11 w-11 place-items-center rounded-2xl shadow-sm",
                    "bg-gradient-to-br from-slate-900 to-slate-700 text-white",
                    "dark:from-white dark:to-zinc-300 dark:text-zinc-950"
                  )}
                >
                  <span className="text-base font-semibold tracking-tight">BRA</span>
                </div>

                <div className="min-w-0">
                  <div className="truncate text-base font-bold tracking-tight text-slate-900 dark:text-white">BRApool</div>
                  <div className="truncate text-xs font-medium text-slate-600 dark:text-zinc-400">
                    Waescheverwaltung • Inventar
                  </div>
                </div>
              </div>
            )}

            {!collapsed && (
              <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-slate-400/15 blur-2xl dark:bg-white/10" />
            )}
          </div>
        </div>

        <nav className="flex-1 px-3 pt-2">
          <div className={cx("space-y-2", collapsed ? "flex flex-col items-center" : "") }>
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = isActivePath(pathname, item.href);

              return (
                <div key={item.href} className={cx("group relative", collapsed ? "flex w-full justify-center" : "") }>
                  <Link
                    href={item.href}
                    className={cx(
                      "relative transition-all duration-200",
                      collapsed
                        ? "grid h-[56px] w-[56px] place-items-center rounded-2xl border"
                        : "flex items-center gap-3 rounded-2xl border px-3 py-3",
                      active
                        ? "border-slate-300 bg-slate-200 text-slate-900 shadow-[0_8px_20px_rgba(15,23,42,0.12)] dark:border-white/15 dark:bg-white/10 dark:text-white dark:shadow-none"
                        : "border-transparent bg-transparent text-slate-800 hover:border-slate-300 hover:bg-slate-100 dark:text-zinc-200 dark:hover:border-white/10 dark:hover:bg-white/5"
                    )}
                  >
                    <div
                      className={cx(
                        "grid place-items-center rounded-2xl border transition-transform duration-200 group-hover:scale-[1.03]",
                        collapsed ? "h-11 w-11" : "h-10 w-10",
                        active
                          ? "border-slate-300 bg-white text-slate-900 dark:border-white/30 dark:bg-white/20 dark:text-white"
                          : "border-border bg-surface text-slate-800 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-zinc-200 dark:shadow-none"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>

                    {!collapsed && (
                      <div className="min-w-0">
                        <div className={cx("truncate text-sm font-medium", active ? "text-slate-900 dark:text-white" : "text-slate-800 dark:text-zinc-200")}>
                          {item.label}
                        </div>
                        <div className={cx("truncate text-xs", active ? "text-slate-600 dark:text-slate-200" : "text-slate-500 dark:text-zinc-500")}>
                          {item.description}
                        </div>
                      </div>
                    )}
                  </Link>
                </div>
              );
            })}
          </div>
        </nav>

        <div className="px-3 pb-4">
          <div className="rounded-2xl border border-border bg-surface p-2 dark:border-white/10 dark:bg-white/5">
            <div className="group relative">
              <button
                onClick={() => setCollapsed((v) => !v)}
                className={cx(
                  "w-full transition-colors",
                  collapsed
                    ? "grid h-[56px] place-items-center rounded-2xl border border-transparent hover:border-slate-300 hover:bg-slate-100 dark:hover:border-white/10 dark:hover:bg-white/5"
                    : "flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-3 text-left text-slate-800 hover:bg-slate-100 dark:border-white/10 dark:bg-zinc-950/30 dark:text-zinc-200 dark:hover:bg-white/10"
                )}
                aria-label={collapsed ? "Sidebar ausklappen" : "Sidebar einklappen"}
                title={collapsed ? "Ausklappen" : "Einklappen"}
              >
                <div className="grid h-10 w-10 place-items-center rounded-2xl border border-border/90 bg-surface text-slate-800 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-zinc-200 dark:shadow-none">
                  <ChevronLeft className={cx("h-5 w-5", collapsed ? "rotate-180" : "")} />
                </div>
                {!collapsed && (
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">Sidebar</div>
                    <div className="truncate text-xs text-slate-500 dark:text-zinc-500">{collapsed ? "Ausklappen" : "Einklappen"}</div>
                  </div>
                )}
              </button>
            </div>

          </div>

          {!collapsed && (
            <div className="mt-3 text-xs text-slate-500 dark:text-zinc-500">
              <span className="opacity-80">BRApool</span> • v0.1
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
