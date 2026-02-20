"use client";

import { useEffect, useMemo, useState } from "react";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-2xl rounded-2xl border border-white/10 bg-zinc-950 p-6">
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold">Benutzer bearbeiten</div>
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
            />
          </div>
          <div className="col-span-12 md:col-span-6">
            <div className="text-xs opacity-70 mb-1">UserID</div>
            <input
              className="w-full rounded-2xl border border-white/10 bg-white/5 p-3 text-sm"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
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
            {saving ? "Speichern…" : "Speichern"}
          </button>
        </div>
      </div>
    </div>
  );
}