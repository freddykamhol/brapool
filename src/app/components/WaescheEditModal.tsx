"use client";

import { useEffect, useMemo, useState } from "react";

type WaescheKategorie = "HOSE" | "POLO" | "SWEATJACKE" | "SOFTSHELLJACKE" | "HARDSHELLJACKE";
type WaescheStatus = "EINGELAGERT" | "UMLAUF" | "DEFEKT_REPARATUR" | "DEFEKT_ENTSORGT";

export type Waesche = {
  systemId: number;
  barcode: string;
  kategorie: WaescheKategorie;
  groesse: string;
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

  const [kategorie, setKategorie] = useState<WaescheKategorie>(item.kategorie);
  const [groesse, setGroesse] = useState(item.groesse);
  const [barcode, setBarcode] = useState(item.barcode);
  const [status, setStatus] = useState<WaescheStatus>(item.status);
  const [bemerkung, setBemerkung] = useState(item.bemerkung ?? "");

  const [ausgetragenVon, setAusgetragenVon] = useState(item.ausgetragenVon ?? "");
  const [ausgegebenAn, setAusgegebenAn] = useState(item.ausgegebenAn ?? "");
  const [ausgabeDatum, setAusgabeDatum] = useState(item.ausgabeDatum ? item.ausgabeDatum.slice(0, 16) : "");

  useEffect(() => {
    if (!open) return;
    setKategorie(item.kategorie);
    setGroesse(item.groesse);
    setBarcode(item.barcode);
    setStatus(item.status);
    setBemerkung(item.bemerkung ?? "");
    setAusgetragenVon(item.ausgetragenVon ?? "");
    setAusgegebenAn(item.ausgegebenAn ?? "");
    setAusgabeDatum(item.ausgabeDatum ? item.ausgabeDatum.slice(0, 16) : "");
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
          status,
          bemerkung,
          ausgetragenVon,
          ausgegebenAn,
          ausgabeDatum: ausgabeDatum ? new Date(ausgabeDatum).toISOString() : null,
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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-2xl rounded-2xl border border-white/10 bg-zinc-950 p-6">
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold">Wäsche bearbeiten</div>
          <button className="rounded-lg border border-white/10 px-3 py-1.5" onClick={onClose}>
            Schließen
          </button>
        </div>

        <div className="mt-5 grid grid-cols-12 gap-4">
          <div className="col-span-12 md:col-span-6">
            <div className="text-sm opacity-70 mb-1">Kategorie</div>
            <select
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
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
            <div className="text-sm opacity-70 mb-1">Status</div>
            <select
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
            >
              <option value="EINGELAGERT">Eingelagert</option>
              <option value="UMLAUF">Umlauf</option>
              <option value="DEFEKT_REPARATUR">Defekt / Reparatur</option>
              <option value="DEFEKT_ENTSORGT">Defekt / Entsorgt</option>
            </select>
          </div>

          <div className="col-span-12 md:col-span-6">
            <div className="text-sm opacity-70 mb-1">Größe</div>
            <input
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
              value={groesse}
              onChange={(e) => setGroesse(e.target.value)}
              placeholder="z.B. L / 52 / XL / 38"
            />
          </div>

          <div className="col-span-12 md:col-span-6">
            <div className="text-sm opacity-70 mb-1">Barcode</div>
            <input
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="z.B. BRA-000123"
            />
          </div>

          <div className="col-span-12">
            <div className="text-sm opacity-70 mb-1">Bemerkung</div>
            <textarea
              className="w-full min-h-[90px] rounded-xl border border-white/10 bg-white/5 px-3 py-2"
              value={bemerkung}
              onChange={(e) => setBemerkung(e.target.value)}
            />
          </div>

          <div className="col-span-12 md:col-span-4">
            <div className="text-sm opacity-70 mb-1">Ausgetragen von</div>
            <input
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
              value={ausgetragenVon}
              onChange={(e) => setAusgetragenVon(e.target.value)}
            />
          </div>

          <div className="col-span-12 md:col-span-4">
            <div className="text-sm opacity-70 mb-1">Ausgegeben an</div>
            <input
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
              value={ausgegebenAn}
              onChange={(e) => setAusgegebenAn(e.target.value)}
            />
          </div>

          <div className="col-span-12 md:col-span-4">
            <div className="text-sm opacity-70 mb-1">Ausgabe Datum</div>
            <input
              type="datetime-local"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
              value={ausgabeDatum}
              onChange={(e) => setAusgabeDatum(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button className="rounded-xl border border-white/10 px-4 py-2" onClick={onClose}>
            Abbrechen
          </button>
          <button
            className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 disabled:opacity-50"
            disabled={!canSave || saving}
            onClick={save}
          >
            {saving ? "Speichern..." : "Speichern"}
          </button>
        </div>
      </div>
    </div>
  );
}