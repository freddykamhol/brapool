"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import {
  LayoutDashboard,
  PackagePlus,
  ArrowRightLeft,
  Database,
  Users,
  ChevronLeft,
  Sun,
  Moon,
} from "lucide-react";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
};

const NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, description: "Übersicht & Hinweise" },
  { label: "Einlagern", href: "/einlagern", icon: PackagePlus, description: "In Bestand aufnehmen" },
  { label: "Ausgeben", href: "/ausgeben", icon: ArrowRightLeft, description: "Umlauf / Übergabe" },
  { label: "Datenbank", href: "/datenbank", icon: Database, description: "Alle Einträge" },
  { label: "Benutzer", href: "/benutzer", icon: Users, description: "Accounts & Rollen" },
];

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function isActivePath(pathname: string, href: string) {
  // exact match, plus nested routes (z.B. /datenbank/123)
  return pathname === href || (href !== "/dashboard" && pathname.startsWith(href + "/"));
}

export default function Sidebar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = typeof window !== "undefined" ? window.localStorage.getItem("brapool.sidebar") : null;
    if (saved === "collapsed") setCollapsed(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    window.localStorage.setItem("brapool.sidebar", collapsed ? "collapsed" : "expanded");
  }, [collapsed, mounted]);

  const isDark = theme === "dark";

  const widthClass = collapsed ? "w-[88px]" : "w-[296px]";

  const activeMap = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const item of NAV) map.set(item.href, isActivePath(pathname, item.href));
    return map;
  }, [pathname]);

  return (
    <aside
      className={cx(
        "sticky top-0 h-screen",
        "border-r border-zinc-200/60 dark:border-white/10",
        "bg-white/70 dark:bg-zinc-950/60 backdrop-blur-xl",
        "transition-[width] duration-300 ease-out",
        widthClass
      )}
    >
      <div className="flex h-full flex-col">
        {/* Brand */}
        <div className={cx("px-4 pt-4", collapsed ? "pb-3" : "pb-4")}>
          <div
            className={cx(
              "relative overflow-hidden rounded-2xl",
              collapsed
                ? "mx-auto grid h-[56px] w-[56px] place-items-center border border-zinc-200/60 bg-white/70 shadow-sm dark:border-white/10 dark:bg-white/5 dark:shadow-none"
                : "border border-zinc-200/60 bg-white shadow-sm dark:border-white/10 dark:bg-white/5 dark:shadow-none transition-all duration-300 p-4"
            )}
          >
            {!collapsed ? (
              <div className="flex items-center gap-3">
                {/* Logo */}
                <div
                  className={cx(
                    "grid place-items-center",
                    "rounded-2xl",
                    "bg-gradient-to-br from-zinc-950 to-zinc-700 text-white",
                    "dark:from-white dark:to-zinc-300 dark:text-zinc-950",
                    "shadow-sm",
                    "h-11 w-11"
                  )}
                  aria-label="BRApool Logo"
                  title="BRApool"
                >
                  <span className="text-base font-semibold tracking-tight">BRA</span>
                </div>

                <div className="min-w-0">
                  <div className="truncate text-base font-semibold tracking-tight">BRApool</div>
                  <div className="truncate text-xs text-zinc-600 dark:text-zinc-400">Wäscheverwaltung • Inventar</div>
                </div>
              </div>
            ) : (
              <div
                className={cx(
                  "grid place-items-center",
                  "rounded-2xl",
                  "bg-gradient-to-br from-zinc-950 to-zinc-700 text-white",
                  "dark:from-white dark:to-zinc-300 dark:text-zinc-950",
                  "shadow-sm",
                  "h-11 w-11"
                )}
                aria-label="BRApool Logo"
                title="BRApool"
              >
                <span className="text-xs font-semibold tracking-tight">BRA</span>
              </div>
            )}

            {/* subtle glow */}
            {!collapsed && (
              <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-zinc-900/10 blur-2xl dark:bg-white/10" />
            )}
          </div>
        </div>

        {/* Nav */}
        <nav className={cx("flex-1 px-3", collapsed ? "pt-2" : "pt-2")}>
          <div className={cx("space-y-2", collapsed ? "flex flex-col items-center" : "")}> 
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = activeMap.get(item.href) === true;

              return (
                <div key={item.href} className={cx("relative", collapsed ? "w-full flex justify-center" : "")}> 
                  <Link
                    href={item.href}
                    className={cx(
                      "group relative",
                      "transition-all duration-200",
                      collapsed
                        ? "grid place-items-center h-[56px] w-[56px] rounded-2xl"
                        : "flex items-center gap-3 rounded-2xl border px-3 py-3",
                      // surface
                      collapsed
                        ? "border border-transparent hover:border-zinc-200/70 hover:bg-zinc-100/70 dark:hover:border-white/10 dark:hover:bg-white/5"
                        : "border-transparent hover:border-zinc-200/70 hover:bg-zinc-100/70 dark:hover:border-white/10 dark:hover:bg-white/5",
                      active
                        ? collapsed
                          ? "bg-zinc-100/80 dark:bg-white/8 border-zinc-200/70 dark:border-white/10"
                          : "border-zinc-200/70 bg-zinc-100/70 dark:border-white/10 dark:bg-white/5"
                        : ""
                    )}
                  >
                    {/* Active indicator (expanded only) */}
                    {!collapsed && (
                      <span
                        className={cx(
                          "absolute left-0 top-1/2 -translate-y-1/2 rounded-r-full transition-all duration-200",
                          active ? "h-8 w-1.5 bg-zinc-950 dark:bg-white" : "h-0 w-0"
                        )}
                      />
                    )}

                    {/* Icon pill */}
                    <div
                      className={cx(
                        "grid place-items-center",
                        collapsed ? "h-11 w-11" : "h-10 w-10",
                        "rounded-2xl border",
                        "border-zinc-200/60 bg-white text-zinc-800 shadow-sm",
                        "dark:border-white/10 dark:bg-white/5 dark:text-zinc-200 dark:shadow-none",
                        "transition-transform duration-200 group-hover:scale-[1.03]",
                        active ? "ring-1 ring-zinc-950/10 dark:ring-white/10" : ""
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>

                    {!collapsed && (
                      <div className="min-w-0">
                        <div
                          className={cx(
                            "truncate text-sm font-medium",
                            active ? "text-zinc-950 dark:text-white" : "text-zinc-800 dark:text-zinc-200"
                          )}
                        >
                          {item.label}
                        </div>
                        <div className="truncate text-xs text-zinc-500 dark:text-zinc-500">{item.description}</div>
                      </div>
                    )}

                    {/* Hover tooltip (collapsed only) */}
                    {collapsed && (
                      <div
                        className={cx(
                          "pointer-events-none absolute left-full top-1/2 z-50 ml-4 -translate-y-1/2",
                          "opacity-0 translate-x-1",
                          "group-hover:opacity-100 group-hover:translate-x-0",
                          "transition-all duration-150",
                          "rounded-xl border border-white/10 bg-zinc-950/95 px-3 py-2 text-xs text-zinc-100 shadow-xl",
                          "dark:bg-zinc-900/95"
                        )}
                      >
                        <div className="font-medium">{item.label}</div>
                        <div className="mt-0.5 opacity-80">{item.description}</div>
                      </div>
                    )}
                  </Link>
                </div>
              );
            })}
          </div>
        </nav>

        {/* Footer */}
        <div className="px-3 pb-4">
          <div
            className={cx(
              "rounded-2xl border p-2",
              "border-zinc-200/60 bg-white/70",
              "dark:border-white/10 dark:bg-white/5"
            )}
          >
            {/* Collapse / Expand */}
            <button
              onClick={() => setCollapsed((v) => !v)}
              className={cx(
                "group w-full transition-colors",
                collapsed
                  ? "grid place-items-center h-[56px] rounded-2xl border border-transparent hover:border-zinc-200/70 hover:bg-zinc-100/70 dark:hover:border-white/10 dark:hover:bg-white/5"
                  : "flex items-center gap-3 rounded-xl border px-3 py-3 text-left",
                !collapsed
                  ? "border-zinc-200/60 bg-white text-zinc-800 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950/30 dark:text-zinc-200 dark:hover:bg-white/10"
                  : ""
              )}
              aria-label={collapsed ? "Sidebar ausklappen" : "Sidebar einklappen"}
              title={collapsed ? "Ausklappen" : "Einklappen"}
            >
              <div
                className={cx(
                  "grid place-items-center rounded-2xl border",
                  collapsed ? "h-11 w-11" : "h-10 w-10",
                  "border-zinc-200/60 bg-white text-zinc-800 shadow-sm",
                  "dark:border-white/10 dark:bg-white/5 dark:text-zinc-200 dark:shadow-none"
                )}
              >
                <ChevronLeft className={cx("h-5 w-5", collapsed ? "rotate-180" : "")} />
              </div>

              {!collapsed && (
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">Sidebar</div>
                  <div className="truncate text-xs text-zinc-500 dark:text-zinc-500">{collapsed ? "Ausklappen" : "Einklappen"}</div>
                </div>
              )}

              {collapsed && (
                <div
                  className={cx(
                    "pointer-events-none absolute left-full top-1/2 z-50 ml-4 -translate-y-1/2",
                    "opacity-0 translate-x-1",
                    "group-hover:opacity-100 group-hover:translate-x-0",
                    "transition-all duration-150",
                    "rounded-xl border border-white/10 bg-zinc-950/95 px-3 py-2 text-xs text-zinc-100 shadow-xl",
                    "dark:bg-zinc-900/95"
                  )}
                >
                  <div className="font-medium">Sidebar</div>
                  <div className="mt-0.5 opacity-80">{collapsed ? "Ausklappen" : "Einklappen"}</div>
                </div>
              )}
            </button>

            <div className="my-2 h-px bg-zinc-200/60 dark:bg-white/10" />

            <button
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className={cx(
                "group w-full transition-colors",
                collapsed
                  ? "grid place-items-center h-[56px] rounded-2xl border border-transparent hover:border-zinc-200/70 hover:bg-zinc-100/70 dark:hover:border-white/10 dark:hover:bg-white/5"
                  : "flex items-center gap-3 rounded-xl border px-3 py-3 text-left",
                !collapsed
                  ? "border-zinc-200/60 bg-white text-zinc-800 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950/30 dark:text-zinc-200 dark:hover:bg-white/10"
                  : ""
              )}
              aria-label="Theme umschalten"
              title="Theme umschalten"
            >
              <div
                className={cx(
                  "grid place-items-center rounded-2xl border",
                  collapsed ? "h-11 w-11" : "h-10 w-10",
                  "border-zinc-200/60 bg-white text-zinc-800 shadow-sm",
                  "dark:border-white/10 dark:bg-white/5 dark:text-zinc-200 dark:shadow-none"
                )}
              >
                {mounted ? (isDark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />) : <div className="h-5 w-5" />}
              </div>

              {!collapsed && (
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">Dark / Light</div>
                  <div className="truncate text-xs text-zinc-500 dark:text-zinc-500">
                    {mounted ? (isDark ? "Dark Mode aktiv" : "Light Mode aktiv") : "…"}
                  </div>
                </div>
              )}

              {/* Hover tooltip (collapsed only) */}
              {collapsed && (
                <div
                  className={cx(
                    "pointer-events-none absolute left-full top-1/2 z-50 ml-4 -translate-y-1/2",
                    "opacity-0 translate-x-1",
                    "group-hover:opacity-100 group-hover:translate-x-0",
                    "transition-all duration-150",
                    "rounded-xl border border-white/10 bg-zinc-950/95 px-3 py-2 text-xs text-zinc-100 shadow-xl",
                    "dark:bg-zinc-900/95"
                  )}
                >
                  <div className="font-medium">Dark / Light</div>
                  <div className="mt-0.5 opacity-80">Theme umschalten</div>
                </div>
              )}
            </button>
          </div>

          {!collapsed && (
            <div className="mt-3 text-xs text-zinc-500 dark:text-zinc-500">
              <span className="opacity-80">BRApool</span> • v0.1
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}