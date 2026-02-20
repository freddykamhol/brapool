"use client";

import { useEffect, useMemo, useState } from "react";
import UserCreateModal, { UserCreateInput } from "@/app/components/UserCreateModal";
import UserEditModal, { UserEditInput } from "@/app/components/UserEditModal";

type UserRow = {
  id: string;
  vorname: string;
  nachname: string;
  email: string;
  userId: string;
  createdAt: string;
};

function fmtDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("de-DE");
}

export default function BenutzerPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = useMemo(() => users.find((u) => u.id === selectedId) ?? null, [users, selectedId]);

  const [loading, setLoading] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const [resetOpen, setResetOpen] = useState(false);
const [resetBusy, setResetBusy] = useState(false);

  async function reload() {
    setLoading(true);
    try {
      const res = await fetch("/api/users", { cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (json?.ok && Array.isArray(json.users)) {
        setUsers(json.users);
        if (!selectedId && json.users.length) setSelectedId(json.users[0].id);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
    const t = setInterval(reload, 20000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function ensureSelected() {
    if (!selected) {
      alert("Bitte einen Benutzer auswählen.");
      return false;
    }
    return true;
  }

  async function createUser(data: UserCreateInput) {
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json().catch(() => null);
    if (!json?.ok) throw new Error(json?.error ?? "Anlegen fehlgeschlagen");
    await reload();
  }

  async function editUser(id: string, data: UserEditInput) {
  const res = await fetch(`/api/users/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  // Erst versuchen JSON zu lesen – falls Server HTML liefert, fallback auf text
  let json: any = null;
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    json = await res.json().catch(() => null);
  } else {
    const text = await res.text().catch(() => "");
    throw new Error(`Server antwortet nicht mit JSON (Status ${res.status}). ${text.slice(0, 200)}`);
  }

  if (!json?.ok) throw new Error(json?.error ?? `Bearbeiten fehlgeschlagen (Status ${res.status})`);
  await reload();
}

  function openResetModal() {
  setNotice(null);
  if (!ensureSelected()) {
    setNotice("Bitte zuerst einen Benutzer auswählen.");
    return;
  }
  setResetOpen(true);
}

async function doResetAndMail() {
  if (!selected) return;
  try {
    setResetBusy(true);
    setNotice("Sende Mail…");

    const res = await fetch(`/api/users/${selected.id}/reset-password`, { method: "POST" });

    const ct = res.headers.get("content-type") || "";
    let payload: any = null;

    if (ct.includes("application/json")) {
      payload = await res.json().catch(() => null);
    } else {
      const text = await res.text().catch(() => "");
      throw new Error(`Server antwortet nicht mit JSON (HTTP ${res.status}). ${text.slice(0, 200)}`);
    }

    if (!payload?.ok) {
      const msg = payload?.error ?? `Passwort-Reset fehlgeschlagen (HTTP ${res.status})`;
      setNotice(msg);
      alert(msg);
      return;
    }

    const messageId = payload?.messageId ? ` (messageId: ${payload.messageId})` : "";
    const msg = `Neues Passwort wurde per Mail versendet.${messageId}`;
    setNotice(msg);
    alert(msg);

    setResetOpen(false);
  } catch (e) {
    const msg = String((e as any)?.message ?? "Unbekannter Fehler beim Mailversand");
    console.error("[Benutzer] reset error", e);
    setNotice(msg);
    alert(msg);
  } finally {
    setResetBusy(false);
  }
}

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-lg font-semibold">Benutzer</div>
            <div className="text-sm opacity-70">Vorname, Nachname, Email verwalten</div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
              onClick={() => {
                if (!ensureSelected()) return;
                setEditOpen(true);
              }}
            >
              Bearbeiten
            </button>

            <button
              className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
              onClick={() => setCreateOpen(true)}
            >
              Anlegen
            </button>

            <button
              className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
              onClick={() => void openResetModal()}
            >
              Neues Passwort + Mail
            </button>

            <button className="rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/5" onClick={reload}>
              {loading ? "Aktualisiere…" : "Aktualisieren"}
            </button>
          </div>
        </div>
        {notice && (
          <div className="mt-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
            {notice}
          </div>
        )}
      </div>

      <div className="grid grid-cols-12 gap-6">
        <section className="col-span-12 lg:col-span-9 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div className="text-lg font-semibold">Übersicht</div>
            <div className="text-sm opacity-70">{users.length} Benutzer</div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-white/10 opacity-80">
                <tr>
                  <th className="px-5 py-3 text-left font-medium">Vorname</th>
                  <th className="px-5 py-3 text-left font-medium">Nachname</th>
                  <th className="px-5 py-3 text-left font-medium">Email</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const active = u.id === selectedId;
                  return (
                    <tr
                      key={u.id}
                      className={["cursor-pointer border-b border-white/5 hover:bg-white/5", active ? "bg-white/10" : ""].join(" ")}
                      onClick={() => setSelectedId(u.id)}
                    >
                      <td className="px-5 py-3">{u.vorname}</td>
                      <td className="px-5 py-3">{u.nachname}</td>
                      <td className="px-5 py-3">{u.email}</td>
                    </tr>
                  );
                })}

                {!users.length && (
                  <tr>
                    <td className="px-5 py-6 opacity-70" colSpan={3}>
                      Noch keine Benutzer vorhanden.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="col-span-12 lg:col-span-3 rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-lg font-semibold">Details</div>

          {!selected ? (
            <div className="mt-4 text-sm opacity-70">Wähle links einen Benutzer aus.</div>
          ) : (
            <>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="opacity-70">UserID</div>
                  <div className="font-medium font-mono text-xs">{selected.userId}</div>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="opacity-70">Vorname</div>
                  <div className="font-medium">{selected.vorname}</div>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="opacity-70">Nachname</div>
                  <div className="font-medium">{selected.nachname}</div>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="opacity-70">Email</div>
                  <div className="font-medium">{selected.email}</div>
                </div>

                <div className="pt-2 border-t border-white/10">
                  <div className="opacity-70 mb-1">Angelegt</div>
                  <div className="text-xs opacity-80">{fmtDateTime(selected.createdAt)}</div>
                </div>
              </div>

              <button
                className="mt-5 w-full rounded-xl border border-white/10 bg-white/10 px-4 py-2 hover:bg-white/15"
                onClick={() => setEditOpen(true)}
              >
                Bearbeiten
              </button>
            </>
          )}
        </aside>
      </div>

      {resetOpen && selected && (
  <div className="fixed inset-0 z-50 flex items-center justify-center">
    <div className="absolute inset-0 bg-black/60" onClick={() => !resetBusy && setResetOpen(false)} />
    <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-zinc-950 p-6">
      <div className="text-lg font-semibold">Neues Passwort senden</div>
      <div className="mt-2 text-sm opacity-80">
        Soll ein neues Passwort erstellt und an <span className="font-medium">{selected.email}</span> gesendet werden?
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <button
          className="rounded-xl border border-white/10 px-4 py-2 hover:bg-white/5 disabled:opacity-50"
          disabled={resetBusy}
          onClick={() => setResetOpen(false)}
        >
          Abbrechen
        </button>

        <button
          className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 hover:bg-white/15 disabled:opacity-50"
          disabled={resetBusy}
          onClick={() => void doResetAndMail()}
        >
          {resetBusy ? "Sende…" : "Senden"}
        </button>
      </div>
    </div>
  </div>
)}

      <UserCreateModal open={createOpen} onClose={() => setCreateOpen(false)} onSubmit={createUser} />

      {selected && (
        <UserEditModal
          open={editOpen}
          user={selected}
          onClose={() => setEditOpen(false)}
          onSubmit={editUser}
        />
      )}
    </div>
  );
}