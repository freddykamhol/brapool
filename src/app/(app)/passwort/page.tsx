"use client";

import { useMemo, useState } from "react";

export default function PasswortPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const canSubmit = useMemo(() => {
    return (
      currentPassword.trim().length > 0 &&
      newPassword.trim().length >= 8 &&
      confirmPassword.trim().length > 0 &&
      !saving
    );
  }, [confirmPassword, currentPassword, newPassword, saving]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setSaving(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      const json = await res.json().catch(() => null);
      if (!json?.ok) {
        alert(json?.error ?? "Passwort ändern fehlgeschlagen");
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      alert("Passwort erfolgreich geändert.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
        <div className="text-lg font-semibold">Passwort ändern</div>
        <div className="text-sm text-zinc-400">Eigenes Passwort sicher aktualisieren</div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
        <form className="space-y-4" onSubmit={submit}>
          <div>
            <label className="mb-1 block text-sm text-zinc-500 dark:text-zinc-400">Aktuelles Passwort</label>
            <input
              type="password"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-white/5"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-zinc-500 dark:text-zinc-400">Neues Passwort</label>
            <input
              type="password"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-white/5"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />
            <div className="mt-1 text-xs text-zinc-400">Mindestens 8 Zeichen.</div>
          </div>

          <div>
            <label className="mb-1 block text-sm text-zinc-500 dark:text-zinc-400">Neues Passwort bestätigen</label>
            <input
              type="password"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-white/5"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-2 hover:bg-slate-100 disabled:opacity-50 dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15"
              disabled={!canSubmit}
            >
              {saving ? "Speichere..." : "Passwort ändern"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
