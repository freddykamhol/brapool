"use client";

import { useEffect, useMemo, useState } from "react";
import ModalShell from "@/app/components/ModalShell";

export type UserCreateInput = {
  vorname: string;
  nachname: string;
  email: string;
  userId: string;
};

function generateUserId(vorname: string, nachname: string) {
  const first = vorname.trim().charAt(0).toLowerCase();
  const last = nachname.trim().toLowerCase().replace(/\s+/g, "_");
  if (!first || !last) return "";
  return `${first}.${last}`;
}

export default function UserCreateModal(props: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: UserCreateInput) => Promise<void>;
}) {
  const { open, onClose, onSubmit } = props;

  const [vorname, setVorname] = useState("");
  const [nachname, setNachname] = useState("");
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [userIdEdited, setUserIdEdited] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setVorname("");
    setNachname("");
    setEmail("");
    setUserId("");
    setUserIdEdited(false);
    setSaving(false);
  }, [open]);

  useEffect(() => {
    if (userIdEdited) return;
    setUserId(generateUserId(vorname, nachname));
  }, [vorname, nachname, userIdEdited]);

  const canSave = useMemo(() => {
    return !!(vorname.trim() && nachname.trim() && email.trim() && userId.trim());
  }, [vorname, nachname, email, userId]);

  async function submit() {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      await onSubmit({
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
          <div className="text-lg font-semibold">Benutzer anlegen</div>
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
              placeholder="name@domain.tld"
            />
          </div>
          <div className="col-span-12 md:col-span-6">
            <div className="mb-1 text-xs text-zinc-500 dark:text-zinc-400">UserID</div>
            <input
              className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-sm dark:border-white/10 dark:bg-white/5"
              value={userId}
              onChange={(e) => {
                setUserIdEdited(true);
                setUserId(e.target.value);
              }}
              placeholder="z.B. m.mustermann"
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
            {saving ? "Anlegen…" : "Anlegen"}
          </button>
        </div>
    </ModalShell>
  );
}
