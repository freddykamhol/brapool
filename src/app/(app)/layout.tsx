"use client";

import { useEffect } from "react";
import MobileBottomNav from "@/app/components/MobileBottomNav";
import MobileHeader from "@/app/components/MobileHeader";
import Sidebar from "@/app/components/Sidebar";
import { usePathname, useRouter } from "next/navigation";

const AUTO_LOGOUT_MS = 30 * 60 * 1000;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let loggingOut = false;

    const logoutNow = async () => {
      if (loggingOut) return;
      loggingOut = true;
      try {
        await fetch("/api/auth/logout", { method: "POST" });
      } finally {
        const next = encodeURIComponent(pathname || "/dashboard");
        router.replace(`/login?next=${next}`);
      }
    };

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        void logoutNow();
      }, AUTO_LOGOUT_MS);
    };

    const events: Array<keyof WindowEventMap> = ["pointerdown", "keydown", "scroll", "touchstart"];
    for (const ev of events) {
      window.addEventListener(ev, resetTimer, { passive: true });
    }

    resetTimer();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      for (const ev of events) {
        window.removeEventListener(ev, resetTimer);
      }
    };
  }, [pathname, router]);

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <MobileHeader />
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="min-w-0 flex-1 p-3 pb-[calc(6.5rem+env(safe-area-inset-bottom))] md:p-6 md:pb-6 lg:p-10">
          <div className="mx-auto w-full max-w-7xl rounded-3xl border border-border bg-surface/95 p-4 shadow-[0_16px_40px_rgba(29,78,216,0.08)] backdrop-blur-md dark:shadow-none md:p-6">
            {children}
          </div>
        </main>
      </div>
      <MobileBottomNav />
    </div>
  );
}
