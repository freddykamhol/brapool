"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRightLeft, Database, LayoutDashboard, PackagePlus, Users } from "lucide-react";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  center?: boolean;
};

const NAV: NavItem[] = [
  { label: "Einlagern", href: "/einlagern", icon: PackagePlus },
  { label: "Ausgeben", href: "/ausgeben", icon: ArrowRightLeft },
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, center: true },
  { label: "Datenbank", href: "/datenbank", icon: Database },
  { label: "Benutzer", href: "/benutzer", icon: Users },
];

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function isActivePath(pathname: string, href: string) {
  return pathname === href || (href !== "/dashboard" && pathname.startsWith(href + "/"));
}

export default function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 md:hidden">
      <div className="mx-auto w-full max-w-md px-2 pb-[max(10px,env(safe-area-inset-bottom))]">
        <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-zinc-950/80 p-2 shadow-[0_24px_60px_rgba(2,6,23,0.55)] backdrop-blur-2xl">
          <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/22 to-transparent" />
          <div className="grid grid-cols-5 items-end">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = isActivePath(pathname, item.href);

            if (item.center) {
              return (
                <Link key={item.href} href={item.href} aria-label={item.label} className="flex justify-center">
                  <div
                    className={cx(
                      "-mt-5 grid h-[58px] w-[58px] place-items-center rounded-2xl border text-white transition-all duration-200",
                      active
                        ? "border-white/25 bg-gradient-to-br from-zinc-500 to-zinc-700 shadow-[0_10px_20px_rgba(15,23,42,0.34)] text-white"
                        : "border-white/12 bg-gradient-to-br from-zinc-700 to-zinc-900 shadow-[0_8px_16px_rgba(15,23,42,0.30)]"
                    )}
                  >
                    <Icon className={cx("h-6 w-6", active ? "opacity-95" : "opacity-80")} />
                  </div>
                </Link>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cx(
                  "relative flex flex-col items-center gap-1 rounded-xl px-1 py-2 text-[11px] transition-all duration-200",
                  active ? "!text-zinc-200" : "!text-zinc-500"
                )}
                aria-label={item.label}
              >
                <div
                  className={cx(
                    "absolute -top-1 h-1 w-8 rounded-full transition-all duration-200",
                    active ? "bg-white/45" : "bg-transparent"
                  )}
                />
                <div
                  className={cx(
                    "grid h-8 w-8 place-items-center rounded-xl border transition-all duration-200",
                    active
                      ? "border-white/[0.14] bg-white/[0.06] shadow-[0_6px_14px_rgba(2,6,23,0.28)]"
                      : "border-transparent bg-transparent"
                  )}
                >
                  <Icon className={cx("h-[18px] w-[18px]", active ? "opacity-95" : "opacity-75")} />
                </div>
                <span className={cx("leading-none", active ? "font-medium" : "font-normal")}>{item.label}</span>
              </Link>
            );
          })}
          </div>
        </div>
      </div>
    </nav>
  );
}
