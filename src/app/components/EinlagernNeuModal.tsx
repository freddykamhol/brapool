"use client";

import { useEffect, useMemo, useState } from "react";
import ModalShell from "@/app/components/ModalShell";

type WaescheKategorie = "HOSE" | "POLO" | "SWEATJACKE" | "SOFTSHELLJACKE" | "HARDSHELLJACKE";

type Row = {
  barcode: string;
  selected: boolean;
  kategorie: WaescheKategorie | "";
  groesse: string;
};

export default function EinlagernNeuModal(props: {
  open: boolean;
  barcodes: string[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const { open, barcodes, onClose, onCreated } = props;

  const [rows, setRows] = useState<Row[]>(
    barcodes.map((b) => ({ barcode: b, selected: true, kategorie: "", groesse: "" }))
  );

  const [bulkKategorie, setBulkKategorie] = useState<WaescheKategorie | "">("");
  const [bulkGroesse, setBulkGroesse] = useState("");
  const [saving, setSaving] = useState(false);

  // reset when reopened or new missing-barcode set arrives
  useEffect(() => {
    if (!open) return;
    setRows(barcodes.map((b) => ({ barcode: b, selected: true, kategorie: "", groesse: "" })));
    setBulkKategorie("");
    setBulkGroesse("");
    setSaving(false);
  }, [open, barcodes]);

  const allSelected = rows.length > 0 && rows.every((r) => r.selected);

  function toggleAll(v: boolean) {
    setRows((prev) => prev.map((r) => ({ ...r, selected: v })));
  }

  function applyBulk() {
    if (!bulkKategorie && !bulkGroesse.trim()) return;

    setRows((prev) =>
      prev.map((r) => {
        if (!r.selected) return r;
        return {
          ...r,
          kategorie: bulkKategorie ? bulkKategorie : r.kategorie,
          groesse: bulkGroesse.trim() ? bulkGroesse : r.groesse,
        };
      })
    );
  }

  const canSave = useMemo(() => {
    // nur ausgewählte müssen vollständig sein
    const selectedRows = rows.filter((r) => r.selected);
    if (!selectedRows.length) return false;
    return selectedRows.every((r) => r.kategorie && r.groesse.trim());
  }, [rows]);

  async function submit() {
    if (!canSave || saving) return;

    const payload = rows
      .filter((r) => r.selected)
      .map((r) => ({ barcode: r.barcode, kategorie: r.kategorie as WaescheKategorie, groesse: r.groesse.trim() }));

    setSaving(true);
    try {
      const res = await fetch("/api/waesche/neu-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: payload }),
      });

      const json = await res.json().catch(() => null);
      if (!json?.ok) {
        alert(json?.error ?? "Anlegen fehlgeschlagen");
        return;
      }

      onCreated();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <ModalShell open={open} onClose={onClose} panelClassName="max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-white/10 dark:bg-slate-900/70 dark:backdrop-blur">
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold">Neue Wäsche anlegen</div>
          <button
            className="rounded-xl border border-slate-300 px-3 py-1.5 hover:bg-slate-100 dark:border-white/10 dark:hover:bg-white/5"
            onClick={onClose}
          >
            Schließen
          </button>
        </div>

        {/* Bulk edit */}
        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
          <div className="text-sm font-medium">Bulk edit</div>
          <div className="mt-3 grid grid-cols-12 gap-3 items-end">
            <div className="col-span-12 md:col-span-4">
              <div className="mb-1 text-xs text-zinc-500 dark:text-zinc-400">Kategorie</div>
              <select
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-white/5"
                value={bulkKategorie}
                onChange={(e) => setBulkKategorie(e.target.value as WaescheKategorie | "")}
              >
                <option value="">—</option>
                <option value="HOSE">Hose</option>
                <option value="POLO">Polo</option>
                <option value="SWEATJACKE">Sweatjacke</option>
                <option value="SOFTSHELLJACKE">Softshelljacke</option>
                <option value="HARDSHELLJACKE">Hardshelljacke</option>
              </select>
            </div>

            <div className="col-span-12 md:col-span-4">
              <div className="mb-1 text-xs text-zinc-500 dark:text-zinc-400">Größe</div>
              <input
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-white/5"
                value={bulkGroesse}
                onChange={(e) => setBulkGroesse(e.target.value)}
                placeholder="z.B. L / 52 / XL"
              />
            </div>

            <div className="col-span-12 md:col-span-4 flex gap-3">
              <button
                className="w-full rounded-xl border border-slate-300 bg-slate-100 px-4 py-2 hover:bg-slate-200 dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15"
                onClick={applyBulk}
              >
                Auf Auswahl anwenden
              </button>
            </div>

            <div className="col-span-12 flex items-center justify-between pt-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => toggleAll(e.target.checked)}
                />
                Alle auswählen
              </label>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">
                Nur ausgewählte Barcodes übernehmen Bulk-Werte.
              </div>
            </div>
          </div>
        </div>

        {/* Rows */}
        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10">
          <div className="grid grid-cols-12 gap-0 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs text-zinc-500 dark:border-white/10 dark:bg-white/5 dark:text-zinc-400">
            <div className="col-span-1">✓</div>
            <div className="col-span-5">Barcode</div>
            <div className="col-span-3">Kategorie</div>
            <div className="col-span-3">Größe</div>
          </div>

          <div className="max-h-[360px] overflow-y-auto">
            {rows.map((r, idx) => (
              <div key={r.barcode} className="grid grid-cols-12 gap-0 border-b border-slate-100 px-4 py-3 text-sm dark:border-white/5">
                <div className="col-span-1 flex items-center">
                  <input
                    type="checkbox"
                    checked={r.selected}
                    onChange={(e) =>
                      setRows((prev) => prev.map((x, i) => (i === idx ? { ...x, selected: e.target.checked } : x)))
                    }
                  />
                </div>

                <div className="col-span-5 flex items-center font-mono text-xs">{r.barcode}</div>

                <div className="col-span-3">
                  <select
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5"
                    value={r.kategorie}
                    onChange={(e) =>
                      setRows((prev) =>
                        prev.map((x, i) =>
                          i === idx ? { ...x, kategorie: e.target.value as WaescheKategorie | "" } : x
                        )
                      )
                    }
                    disabled={!r.selected}
                  >
                    <option value="">—</option>
                    <option value="HOSE">Hose</option>
                    <option value="POLO">Polo</option>
                    <option value="SWEATJACKE">Sweatjacke</option>
                    <option value="SOFTSHELLJACKE">Softshelljacke</option>
                    <option value="HARDSHELLJACKE">Hardshelljacke</option>
                  </select>
                </div>

                <div className="col-span-3">
                  <input
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5"
                    value={r.groesse}
                    onChange={(e) =>
                      setRows((prev) => prev.map((x, i) => (i === idx ? { ...x, groesse: e.target.value } : x)))
                    }
                    disabled={!r.selected}
                    placeholder="z.B. L / 52"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            className="rounded-xl border border-slate-300 px-4 py-2 hover:bg-slate-100 dark:border-white/10 dark:hover:bg-white/5"
            onClick={onClose}
          >
            Abbrechen
          </button>
          <button
            className="rounded-xl border border-slate-300 bg-slate-100 px-4 py-2 hover:bg-slate-200 disabled:opacity-50 dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15"
            onClick={submit}
            disabled={!canSave || saving}
          >
            {saving ? "Anlegen..." : "Anlegen & Einlagern"}
          </button>
        </div>
    </ModalShell>
  );
}
