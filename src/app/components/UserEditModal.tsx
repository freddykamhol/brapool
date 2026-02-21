"use client";

import { useEffect, useMemo, useState } from "react";
import ModalShell from "@/app/components/ModalShell";

export type UserEditInput = {
  vorname: string;
  nachname: string;
  email: string;
  userId: string;
};

export type UserEditItem = {
  id: string;
  vorname: string;
  nachname: string;
  email: string;
  userId: string;
};

export default function UserEditModal(props: {
  open: boolean;
  user: UserEditItem;
  onClose: () => void;
  onSubmit: (id: string, data: UserEditInput) => Promise<void>;
}) {
  const { open, user, onClose, onSubmit } = props;

  const [vorname, setVorname] = useState(user.vorname);
  const [nachname, setNachname] = useState(user.nachname);
  const [email, setEmail] = useState(user.email);
  const [userId, setUserId] = useState(user.userId);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setVorname(user.vorname);
    setNachname(user.nachname);
    setEmail(user.email);
    setUserId(user.userId);
    setSaving(false);
  }, [open, user]);

  const canSave = useMemo(() => {
    return !!(vorname.trim() && nachname.trim() && email.trim() && userId.trim());
  }, [vorname, nachname, email, userId]);

  async function submit() {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      await onSubmit(user.id, {
        vorname: vorname.trim(),
        nachname: nachname.trim(),
        email: email.trim(),
        userId: userId.trim(),
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <ModalShell open={open} onClose={onClose} panelClassName="max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-white/10 dark:bg-slate-900/70 dark:backdrop-blur">
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold">Benutzer bearbeiten</div>
          <button
            className="rounded-xl border border-slate-300 px-3 py-1.5 hover:bg-slate-100 dark:border-white/10 dark:hover:bg-white/5"
            onClick={onClose}
          >
            Schließen
          </button>
        </div>

        <div className="mt-5 grid grid-cols-12 gap-4">
          <div className="col-span-12 md:col-span-6">
            <div className="mb-1 text-xs text-zinc-500 dark:text-zinc-400">Vorname</div>
            <input
              className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-sm dark:border-white/10 dark:bg-white/5"
              value={vorname}
              onChange={(e) => setVorname(e.target.value)}
            />
          </div>
          <div className="col-span-12 md:col-span-6">
            <div className="mb-1 text-xs text-zinc-500 dark:text-zinc-400">Nachname</div>
            <input
              className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-sm dark:border-white/10 dark:bg-white/5"
              value={nachname}
              onChange={(e) => setNachname(e.target.value)}
            />
          </div>
          <div className="col-span-12 md:col-span-6">
            <div className="mb-1 text-xs text-zinc-500 dark:text-zinc-400">Email</div>
            <input
              className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-sm dark:border-white/10 dark:bg-white/5"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="col-span-12 md:col-span-6">
            <div className="mb-1 text-xs text-zinc-500 dark:text-zinc-400">UserID</div>
            <input
              className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-sm dark:border-white/10 dark:bg-white/5"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            className="rounded-xl border border-slate-300 px-4 py-2 hover:bg-slate-100 dark:border-white/10 dark:hover:bg-white/5"
            onClick={onClose}
          >
            Abbrechen
          </button>
          <button
            className="rounded-xl border border-slate-300 bg-slate-100 px-4 py-2 hover:bg-slate-200 disabled:opacity-50 dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15"
            disabled={!canSave || saving}
            onClick={submit}
          >
            {saving ? "Speichern…" : "Speichern"}
          </button>
        </div>
    </ModalShell>
  );
}
