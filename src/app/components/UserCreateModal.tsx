"use client";

import { useEffect, useMemo, useState } from "react";

export type UserCreateInput = {
  vorname: string;
  nachname: string;
  email: string;
  userId: string;
};

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
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setVorname("");
    setNachname("");
    setEmail("");
    setUserId("");
    setSaving(false);
  }, [open]);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-2xl rounded-2xl border border-white/10 bg-zinc-950 p-6">
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold">Benutzer anlegen</div>
          <button className="rounded-xl border border-white/10 px-3 py-1.5 hover:bg-white/5" onClick={onClose}>
            Schließen
          </button>
        </div>

        <div className="mt-5 grid grid-cols-12 gap-4">
          <div className="col-span-12 md:col-span-6">
            <div className="text-xs opacity-70 mb-1">Vorname</div>
            <input
              className="w-full rounded-2xl border border-white/10 bg-white/5 p-3 text-sm"
              value={vorname}
              onChange={(e) => setVorname(e.target.value)}
            />
          </div>
          <div className="col-span-12 md:col-span-6">
            <div className="text-xs opacity-70 mb-1">Nachname</div>
            <input
              className="w-full rounded-2xl border border-white/10 bg-white/5 p-3 text-sm"
              value={nachname}
              onChange={(e) => setNachname(e.target.value)}
            />
          </div>
          <div className="col-span-12 md:col-span-6">
            <div className="text-xs opacity-70 mb-1">Email</div>
            <input
              className="w-full rounded-2xl border border-white/10 bg-white/5 p-3 text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@domain.tld"
            />
          </div>
          <div className="col-span-12 md:col-span-6">
            <div className="text-xs opacity-70 mb-1">UserID</div>
            <input
              className="w-full rounded-2xl border border-white/10 bg-white/5 p-3 text-sm"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="z.B. f.karamazmy"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button className="rounded-xl border border-white/10 px-4 py-2 hover:bg-white/5" onClick={onClose}>
            Abbrechen
          </button>
          <button
            className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 hover:bg-white/15 disabled:opacity-50"
            disabled={!canSave || saving}
            onClick={submit}
          >
            {saving ? "Anlegen…" : "Anlegen"}
          </button>
        </div>
      </div>
    </div>
  );
}