"use client";

import { useEffect, useMemo, useState } from "react";
import ModalShell from "@/app/components/ModalShell";

type WaescheKategorie = "HOSE" | "POLO" | "SWEATJACKE" | "SOFTSHELLJACKE" | "HARDSHELLJACKE";
type WaescheStatus = "EINGELAGERT" | "UMLAUF" | "DEFEKT_REPARATUR" | "DEFEKT_ENTSORGT";

export type Waesche = {
  systemId: number;
  barcode: string;
  kategorie: WaescheKategorie;
  groesse: string;
  cws: boolean;
  status: WaescheStatus;
  bemerkung: string | null;
  ausgetragenVon: string | null;
  ausgegebenAn: string | null;
  ausgabeDatum: string | null;
};

export default function WaescheEditModal(props: {
  open: boolean;
  item: Waesche;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { open, item, onClose, onSaved } = props;

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [kategorie, setKategorie] = useState<WaescheKategorie>(item.kategorie);
  const [groesse, setGroesse] = useState(item.groesse);
  const [barcode, setBarcode] = useState(item.barcode);
  const [cws, setCws] = useState(item.cws);
  const [status, setStatus] = useState<WaescheStatus>(item.status);
  const [bemerkung, setBemerkung] = useState(item.bemerkung ?? "");

  const [ausgetragenVon, setAusgetragenVon] = useState(item.ausgetragenVon ?? "");
  const [ausgegebenAn, setAusgegebenAn] = useState(item.ausgegebenAn ?? "");

  useEffect(() => {
    if (!open) return;
    setKategorie(item.kategorie);
    setGroesse(item.groesse);
    setBarcode(item.barcode);
    setCws(item.cws);
    setStatus(item.status);
    setBemerkung(item.bemerkung ?? "");
    setAusgetragenVon(item.ausgetragenVon ?? "");
    setAusgegebenAn(item.ausgegebenAn ?? "");
    setDeleting(false);
    setConfirmDelete(false);
  }, [open, item]);

  const canSave = useMemo(() => {
    if (!barcode.trim()) return false;
    if (!groesse.trim()) return false;
    return true;
  }, [barcode, groesse]);

  async function save() {
    if (!canSave || saving) return;

    setSaving(true);
    try {
      const res = await fetch("/api/waesche", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemId: item.systemId,
          kategorie,
          groesse,
          barcode,
          cws,
          status,
          bemerkung,
          ausgetragenVon,
          ausgegebenAn,
          ausgabeDatum: new Date().toISOString(),
        }),
      });

      const json = await res.json().catch(() => null);
      if (!json?.ok) {
        alert(json?.error ?? "Speichern fehlgeschlagen");
        return;
      }

      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (saving || deleting) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`/api/waesche?systemId=${item.systemId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemId: item.systemId }),
      });

      const json = await res.json().catch(() => null);
      if (!json?.ok) {
        alert(json?.error ?? `Löschen fehlgeschlagen (HTTP ${res.status})`);
        return;
      }

      onSaved();
      onClose();
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  if (!open) return null;

  return (
    <ModalShell open={open} onClose={onClose} panelClassName="max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-white/10 dark:bg-slate-900/70 dark:backdrop-blur">
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold">Wäsche bearbeiten</div>
          <button
            className="rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-100 dark:border-white/10 dark:hover:bg-white/5"
            onClick={onClose}
          >
            Schließen
          </button>
        </div>

        <div className="mt-5 grid grid-cols-12 gap-4">
          <div className="col-span-12 md:col-span-6">
            <div className="mb-1 text-sm text-zinc-500 dark:text-zinc-400">Kategorie</div>
            <select
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-white/5"
              value={kategorie}
              onChange={(e) => setKategorie(e.target.value as WaescheKategorie)}
            >
              <option value="HOSE">Hose</option>
              <option value="POLO">Polo</option>
              <option value="SWEATJACKE">Sweatjacke</option>
              <option value="SOFTSHELLJACKE">Softshelljacke</option>
              <option value="HARDSHELLJACKE">Hardshelljacke</option>
            </select>
          </div>

          <div className="col-span-12 md:col-span-6">
            <div className="mb-1 text-sm text-zinc-500 dark:text-zinc-400">Status</div>
            <select
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-white/5"
              value={status}
              onChange={(e) => setStatus(e.target.value as WaescheStatus)}
            >
              <option value="EINGELAGERT">Eingelagert</option>
              <option value="UMLAUF">Umlauf</option>
              <option value="DEFEKT_REPARATUR">Defekt / Reparatur</option>
              <option value="DEFEKT_ENTSORGT">Defekt / Entsorgt</option>
            </select>
          </div>

          <div className="col-span-12 md:col-span-6">
            <div className="mb-1 text-sm text-zinc-500 dark:text-zinc-400">CWS</div>
            <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-white/5">
              <input
                type="checkbox"
                className="h-4 w-4 accent-slate-700 dark:accent-slate-200"
                checked={cws}
                onChange={(e) => setCws(e.target.checked)}
              />
              <span className="text-sm">{cws ? "Aktiv" : "Nicht aktiv"}</span>
            </label>
          </div>

          <div className="col-span-12 md:col-span-6">
            <div className="mb-1 text-sm text-zinc-500 dark:text-zinc-400">Größe</div>
            <input
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-white/5"
              value={groesse}
              onChange={(e) => setGroesse(e.target.value)}
              placeholder="z.B. L / 52 / XL / 38"
            />
          </div>

          <div className="col-span-12 md:col-span-6">
            <div className="mb-1 text-sm text-zinc-500 dark:text-zinc-400">Barcode</div>
            <input
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-white/5"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="z.B. BRA-000123"
            />
          </div>

          <div className="col-span-12">
            <div className="mb-1 text-sm text-zinc-500 dark:text-zinc-400">Bemerkung</div>
            <textarea
              className="w-full min-h-[90px] rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-white/5"
              value={bemerkung}
              onChange={(e) => setBemerkung(e.target.value)}
            />
          </div>

          <div className="col-span-12 md:col-span-4">
            <div className="mb-1 text-sm text-zinc-500 dark:text-zinc-400">Ausgetragen von</div>
            <input
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-white/5"
              value={ausgetragenVon}
              onChange={(e) => setAusgetragenVon(e.target.value)}
            />
          </div>

          <div className="col-span-12 md:col-span-4">
            <div className="mb-1 text-sm text-zinc-500 dark:text-zinc-400">Ausgegeben an</div>
            <input
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-white/5"
              value={ausgegebenAn}
              onChange={(e) => setAusgegebenAn(e.target.value)}
            />
          </div>

          <div className="col-span-12 md:col-span-4">
            <div className="mb-1 text-sm text-zinc-500 dark:text-zinc-400">Ausgabe Datum</div>
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-zinc-500 dark:border-white/10 dark:bg-white/5 dark:text-zinc-400">
              Wird beim Speichern automatisch auf jetzt gesetzt.
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <button
            className={[
              "rounded-xl border px-4 py-2 disabled:opacity-50",
              confirmDelete
                ? "border-red-500 bg-red-600 text-white hover:bg-red-700 dark:border-red-400 dark:bg-red-500 dark:hover:bg-red-600"
                : "border-red-300 text-red-700 hover:bg-red-50 dark:border-red-500/40 dark:text-red-200 dark:hover:bg-red-500/10",
            ].join(" ")}
            onClick={remove}
            disabled={saving || deleting}
          >
            {deleting ? "Löschen..." : confirmDelete ? "Wirklich löschen?" : "Löschen"}
          </button>
          <div className="flex gap-3">
          <button
            className="rounded-xl border border-slate-300 px-4 py-2 hover:bg-slate-100 dark:border-white/10 dark:hover:bg-white/5"
            onClick={() => {
              setConfirmDelete(false);
              onClose();
            }}
          >
            Abbrechen
          </button>
          <button
            className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-2 hover:bg-slate-100 disabled:opacity-50 dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15"
            disabled={!canSave || saving || deleting}
            onClick={save}
          >
            {saving ? "Speichern..." : "Speichern"}
          </button>
          </div>
        </div>
    </ModalShell>
  );
}
