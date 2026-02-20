"use client";

import { useEffect, useMemo, useState } from "react";
import WaescheEditModal from "@/app/components/WaescheEditModal";
import EinlagernNeuModal from "@/app/components/EinlagernNeuModal";
import CsvImportModal from "@/app/components/CsvImportModal";

type WaescheStatus = "EINGELAGERT" | "UMLAUF" | "DEFEKT_REPARATUR" | "DEFEKT_ENTSORGT";
type WaescheKategorie = "HOSE" | "POLO" | "SWEATJACKE" | "SOFTSHELLJACKE" | "HARDSHELLJACKE";

type Waesche = {
  systemId: number;
  barcode: string;
  kategorie: WaescheKategorie;
  groesse: string;
  status: WaescheStatus;
  bemerkung: string | null;

  eingelagertAm: string | null;
  ausgetragenVon: string | null;
  ausgegebenAn: string | null;
  ausgabeDatum: string | null;

  createdAt: string;
  updatedAt?: string;
};

function fmtDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("de-DE");
}

function statusLabel(s: WaescheStatus) {
  switch (s) {
    case "EINGELAGERT":
      return "Eingelagert";
    case "UMLAUF":
      return "Umlauf";
    case "DEFEKT_REPARATUR":
      return "Defekt / Reparatur";
    case "DEFEKT_ENTSORGT":
      return "Defekt / Entsorgt";
  }
}

function statusBadgeClass(s: WaescheStatus) {
  switch (s) {
    case "EINGELAGERT":
      return "border-green-500/30 bg-green-500/10 text-green-200";
    case "UMLAUF":
      return "border-yellow-500/30 bg-yellow-500/10 text-yellow-100";
    case "DEFEKT_REPARATUR":
      return "border-red-500/30 bg-red-500/10 text-red-200";
    case "DEFEKT_ENTSORGT":
      return "border-zinc-700/60 bg-zinc-950/40 text-zinc-200";
  }
}

function parseBarcodes(text: string): string[] {
  const parts = text
    .split(/[\n,; \t]+/g)
    .map((x) => x.trim())
    .filter(Boolean);
  return Array.from(new Set(parts));
}

export default function DatenbankPage() {
  const [items, setItems] = useState<Waesche[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);

  // Bulk-create (two-step)
  const [bulkPanelOpen, setBulkPanelOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createBarcodes, setCreateBarcodes] = useState<string[]>([]);

  const selected = useMemo(
    () => items.find((x) => x.systemId === selectedId) ?? null,
    [items, selectedId]
  );

  async function reload() {
    const res = await fetch("/api/waesche", { cache: "no-store" });
    const json = await res.json().catch(() => null);
    if (json?.ok && Array.isArray(json.items)) {
      setItems(json.items);
      if (selectedId === null && json.items.length) setSelectedId(json.items[0].systemId);
    }
  }

  useEffect(() => {
    reload();
    // optional: refresh alle 15s
    const t = setInterval(reload, 15000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openSingleEdit() {
    if (!selected) {
      alert("Bitte links ein Wäschestück auswählen.");
      return;
    }
    setEditOpen(true);
  }

  function openBulkCreate() {
    setBulkPanelOpen(true);
  }

  function startBulkCreate() {
    const bcs = parseBarcodes(bulkText);
    if (!bcs.length) {
      alert("Bitte mindestens einen Barcode eingeben.");
      return;
    }
    setCreateBarcodes(bcs);
    setCreateOpen(true);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Top actions */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-lg font-semibold">Datenbank</div>
            <div className="text-sm opacity-70">Alle Wäschestücke verwalten</div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
              onClick={() => setCsvOpen(true)}
            >
              CSV Import
            </button>

            <button
              className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
              onClick={openSingleEdit}
            >
              Bearbeiten
            </button>

            <button
              className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
              onClick={openBulkCreate}
            >
              Erstellen (Bulk neu)
            </button>

            <button
              className="rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/5"
              onClick={reload}
            >
              Aktualisieren
            </button>
          </div>
        </div>

        {/* Bulk create panel */}
        {bulkPanelOpen && (
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-medium">Bulk neu anlegen</div>
                <div className="text-xs opacity-70">Barcodes mehrzeilig einfügen, dann „Weiter“.</div>
              </div>
              <button
                className="rounded-xl border border-white/10 px-3 py-1.5 text-sm hover:bg-white/5"
                onClick={() => setBulkPanelOpen(false)}
              >
                Schließen
              </button>
            </div>

            <textarea
              className="mt-3 w-full min-h-[140px] rounded-2xl border border-white/10 bg-white/5 p-4 font-mono text-sm"
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder={"BRA-0100\nBRA-0101\nBRA-0102"}
            />

            <div className="mt-3 flex items-center justify-between">
              <div className="text-xs opacity-70">{parseBarcodes(bulkText).length} eindeutige Barcodes erkannt</div>
              <button
                className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
                onClick={startBulkCreate}
              >
                Weiter
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main: table + details */}
      <div className="grid grid-cols-12 gap-6">
        <section className="col-span-12 lg:col-span-9 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div className="text-lg font-semibold">Wäsche</div>
            <div className="text-sm opacity-70">{items.length} Einträge</div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-white/10 opacity-80">
                <tr>
                  <th className="px-5 py-3 text-left font-medium">Kategorie</th>
                  <th className="px-5 py-3 text-left font-medium">Größe</th>
                  <th className="px-5 py-3 text-left font-medium">Barcode</th>
                  <th className="px-5 py-3 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => {
                  const active = it.systemId === selectedId;
                  return (
                    <tr
                      key={it.systemId}
                      className={[
                        "cursor-pointer border-b border-white/5 hover:bg-white/5",
                        active ? "bg-white/10" : "",
                      ].join(" ")}
                      onClick={() => setSelectedId(it.systemId)}
                    >
                      <td className="px-5 py-3">{it.kategorie}</td>
                      <td className="px-5 py-3">{it.groesse}</td>
                      <td className="px-5 py-3 font-mono text-xs">{it.barcode}</td>
                      <td className="px-5 py-3">
                        <span
                          className={
                            "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium " +
                            statusBadgeClass(it.status)
                          }
                        >
                          {statusLabel(it.status as any)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {!items.length && (
                  <tr>
                    <td className="px-5 py-6 opacity-70" colSpan={4}>
                      Noch keine Einträge vorhanden.
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
            <div className="mt-4 text-sm opacity-70">Wähle links ein Wäschestück aus.</div>
          ) : (
            <>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="opacity-70">System-ID</div>
                  <div className="font-medium">{selected.systemId}</div>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="opacity-70">Kategorie</div>
                  <div className="font-medium">{selected.kategorie}</div>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="opacity-70">Größe</div>
                  <div className="font-medium">{selected.groesse}</div>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="opacity-70">Barcode</div>
                  <div className="font-medium font-mono text-xs">{selected.barcode}</div>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="opacity-70">Status</div>
                  <div className="font-medium">
                    <span
                      className={
                        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium " +
                        statusBadgeClass(selected.status)
                      }
                    >
                      {statusLabel(selected.status as any)}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/10">
                  <div className="opacity-70 mb-1">Bemerkung</div>
                  <div className="whitespace-pre-wrap">{selected.bemerkung ?? "—"}</div>
                </div>

                <div className="pt-2 border-t border-white/10">
                  <div className="opacity-70 mb-1">Einlagerung</div>
                  <div className="text-xs opacity-80">{fmtDateTime(selected.eingelagertAm)}</div>
                </div>

                <div className="pt-2 border-t border-white/10">
                  <div className="opacity-70 mb-1">Ausgabe</div>
                  <div className="text-xs opacity-80">
                    <div>Ausgetragen von: {selected.ausgetragenVon ?? "—"}</div>
                    <div>Ausgegeben an: {selected.ausgegebenAn ?? "—"}</div>
                    <div>Datum: {fmtDateTime(selected.ausgabeDatum)}</div>
                  </div>
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

      {selected && (
        <WaescheEditModal
          open={editOpen}
          item={selected as any}
          onClose={() => setEditOpen(false)}
          onSaved={reload}
        />
      )}

      <EinlagernNeuModal
        open={createOpen}
        barcodes={createBarcodes}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          setBulkText("");
          setBulkPanelOpen(false);
          setCreateBarcodes([]);
          reload();
        }}
      />

      <CsvImportModal
        open={csvOpen}
        onClose={() => setCsvOpen(false)}
        onConfirmImport={async (rows) => {
          // API folgt später – aktuell nur Preview/Parsing.
          console.log("CSV rows", rows);
        }}
      />
    </div>
  );
}