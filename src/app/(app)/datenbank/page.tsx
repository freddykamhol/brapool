"use client";

import { useEffect, useMemo, useState } from "react";
import WaescheEditModal from "@/app/components/WaescheEditModal";
import EinlagernNeuModal from "@/app/components/EinlagernNeuModal";
import CsvImportModal from "@/app/components/CsvImportModal";
import MonthlyReportModal from "@/app/components/MonthlyReportModal";
import { parseWaescheCsvRows } from "@/app/lib/waesche-csv";

type WaescheStatus = "EINGELAGERT" | "UMLAUF" | "DEFEKT_REPARATUR" | "DEFEKT_ENTSORGT";
type WaescheKategorie = "HOSE" | "POLO" | "SWEATJACKE" | "SOFTSHELLJACKE" | "HARDSHELLJACKE";

type Waesche = {
  systemId: number;
  barcode: string;
  kategorie: WaescheKategorie;
  groesse: string;
  cws: boolean;
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
      return "border border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-green-500/40 dark:bg-green-500/10 dark:text-green-200";
    case "UMLAUF":
      return "border border-amber-300 bg-amber-50 text-amber-800 dark:border-yellow-500/40 dark:bg-yellow-500/10 dark:text-yellow-100";
    case "DEFEKT_REPARATUR":
      return "border border-red-300 bg-red-50 text-red-800 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200";
    case "DEFEKT_ENTSORGT":
      return "border border-slate-300 bg-slate-100 text-slate-700 dark:border-zinc-700/60 dark:bg-zinc-950/40 dark:text-zinc-200";
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
  const [monthlyReportOpen, setMonthlyReportOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<WaescheStatus | "ALLE">("ALLE");
  const [kategorieFilter, setKategorieFilter] = useState<WaescheKategorie | "ALLE">("ALLE");

  // Bulk-create (two-step)
  const [bulkPanelOpen, setBulkPanelOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createBarcodes, setCreateBarcodes] = useState<string[]>([]);

  const selected = useMemo(
    () => items.find((x) => x.systemId === selectedId) ?? null,
    [items, selectedId]
  );
  const stats = useMemo(() => {
    const total = items.length;
    const cwsKnown = items.filter((x) => x.cws).length;
    return { total, cwsKnown };
  }, [items]);
  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((it) => {
      if (statusFilter !== "ALLE" && it.status !== statusFilter) return false;
      if (kategorieFilter !== "ALLE" && it.kategorie !== kategorieFilter) return false;
      if (!q) return true;

      return (
        it.barcode.toLowerCase().includes(q) ||
        it.groesse.toLowerCase().includes(q) ||
        it.kategorie.toLowerCase().includes(q) ||
        String(it.systemId).includes(q) ||
        (it.bemerkung ?? "").toLowerCase().includes(q) ||
        (it.ausgegebenAn ?? "").toLowerCase().includes(q) ||
        (it.ausgetragenVon ?? "").toLowerCase().includes(q)
      );
    });
  }, [items, search, statusFilter, kategorieFilter]);

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
      <div className="rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-lg font-semibold">Datenbank</div>
            <div className="text-sm text-zinc-400">Alle Wäschestücke verwalten</div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-xl border border-slate-300 bg-slate-50 dark:border-white/10 dark:bg-white/10 px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-white/15"
              onClick={() => setCsvOpen(true)}
            >
              CSV Import
            </button>

            <button
              className="rounded-xl border border-slate-300 bg-slate-50 dark:border-white/10 dark:bg-white/10 px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-white/15"
              onClick={openSingleEdit}
            >
              Bearbeiten
            </button>

            <button
              className="rounded-xl border border-slate-300 bg-slate-50 dark:border-white/10 dark:bg-white/10 px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-white/15"
              onClick={openBulkCreate}
            >
              Erstellen (Bulk neu)
            </button>

            <button
              className="rounded-xl border border-slate-300 bg-slate-50 dark:border-white/10 dark:bg-white/10 px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-white/15"
              onClick={() => setMonthlyReportOpen(true)}
            >
              Monatsbericht
            </button>

            <button
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100 dark:border-white/10 dark:hover:bg-white/5"
              onClick={reload}
            >
              Aktualisieren
            </button>
          </div>
        </div>

        {/* Bulk create panel */}
        {bulkPanelOpen && (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-medium">Bulk neu anlegen</div>
                <div className="text-xs text-zinc-400">Barcodes mehrzeilig einfügen, dann „Weiter“.</div>
              </div>
              <button
                className="rounded-xl border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100 dark:border-white/10 dark:hover:bg-white/5"
                onClick={() => setBulkPanelOpen(false)}
              >
                Schließen
              </button>
            </div>

            <textarea
              className="mt-3 w-full min-h-[140px] rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5 p-4 font-mono text-sm"
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder={"BRA-0100\nBRA-0101\nBRA-0102"}
            />

            <div className="mt-3 flex items-center justify-between">
              <div className="text-xs text-zinc-400">{parseBarcodes(bulkText).length} eindeutige Barcodes erkannt</div>
              <button
                className="rounded-xl border border-slate-300 bg-slate-50 dark:border-white/10 dark:bg-white/10 px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-white/15"
                onClick={startBulkCreate}
              >
                Weiter
              </button>
            </div>
          </div>
        )}

        <div className="mt-4 rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5 p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/10">
              <div className="text-4xl font-semibold leading-none">{stats.total}</div>
              <div className="mt-2 text-sm text-zinc-400">Gesamtbestand</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/10">
              <div className="text-4xl font-semibold leading-none">{stats.cwsKnown}</div>
              <div className="mt-2 text-sm text-zinc-400">bei CWS bekannt</div>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5 p-4">
          <div className="text-sm font-medium">Suche & Filter</div>
          <div className="mt-3 grid grid-cols-12 gap-3">
            <div className="col-span-12 md:col-span-6">
              <div className="mb-1 text-xs text-zinc-500 dark:text-zinc-400">Suche</div>
              <input
                className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm dark:border-white/10 dark:bg-white/5"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Barcode, Größe, Kategorie, Bemerkung, Name ..."
              />
            </div>
            <div className="col-span-6 md:col-span-3">
              <div className="mb-1 text-xs text-zinc-500 dark:text-zinc-400">Status</div>
              <select
                className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm dark:border-white/10 dark:bg-white/5"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as WaescheStatus | "ALLE")}
              >
                <option value="ALLE">Alle</option>
                <option value="EINGELAGERT">Eingelagert</option>
                <option value="UMLAUF">Umlauf</option>
                <option value="DEFEKT_REPARATUR">Defekt / Reparatur</option>
                <option value="DEFEKT_ENTSORGT">Defekt / Entsorgt</option>
              </select>
            </div>
            <div className="col-span-6 md:col-span-3">
              <div className="mb-1 text-xs text-zinc-500 dark:text-zinc-400">Kategorie</div>
              <select
                className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm dark:border-white/10 dark:bg-white/5"
                value={kategorieFilter}
                onChange={(e) => setKategorieFilter(e.target.value as WaescheKategorie | "ALLE")}
              >
                <option value="ALLE">Alle</option>
                <option value="HOSE">Hose</option>
                <option value="POLO">Polo</option>
                <option value="SWEATJACKE">Sweatjacke</option>
                <option value="SOFTSHELLJACKE">Softshelljacke</option>
                <option value="HARDSHELLJACKE">Hardshelljacke</option>
              </select>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <div className="text-xs text-zinc-400">{filteredItems.length} Treffer</div>
            <button
              className="rounded-xl border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100 dark:border-white/10 dark:hover:bg-white/5"
              onClick={() => {
                setSearch("");
                setStatusFilter("ALLE");
                setKategorieFilter("ALLE");
              }}
            >
              Filter zurücksetzen
            </button>
          </div>
        </div>
      </div>

      {/* Main: table + details */}
      <div className="grid grid-cols-12 gap-6">
        <section className="col-span-12 lg:col-span-9 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 px-5 py-4">
            <div className="text-lg font-semibold">Wäsche</div>
            <div className="text-sm text-zinc-400">{filteredItems.length} Einträge</div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 dark:border-white/10 text-zinc-300">
                <tr>
                  <th className="px-5 py-3 text-left font-medium">Kategorie</th>
                  <th className="px-5 py-3 text-left font-medium">Größe</th>
                  <th className="px-5 py-3 text-left font-medium">Barcode</th>
                  <th className="px-5 py-3 text-center font-medium">CWS</th>
                  <th className="px-5 py-3 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((it) => {
                  const active = it.systemId === selectedId;
                  return (
                    <tr
                      key={it.systemId}
                      className={[
                        "cursor-pointer border-b border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5",
                        active ? "bg-slate-100 dark:bg-white/10" : "",
                      ].join(" ")}
                      onClick={() => setSelectedId(it.systemId)}
                    >
                      <td className="px-5 py-3">{it.kategorie}</td>
                      <td className="px-5 py-3">{it.groesse}</td>
                      <td className="px-5 py-3 font-mono text-xs">{it.barcode}</td>
                      <td className="px-5 py-3 text-center">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-slate-700 dark:accent-slate-200"
                          checked={it.cws}
                          readOnly
                          aria-label={`CWS ${it.cws ? "aktiv" : "inaktiv"}`}
                        />
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={
                            "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium " +
                            statusBadgeClass(it.status)
                          }
                        >
                          {statusLabel(it.status)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {!filteredItems.length && (
                  <tr>
                    <td className="px-5 py-6 text-zinc-400" colSpan={5}>
                      Noch keine Einträge vorhanden.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="col-span-12 lg:col-span-3 rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5 p-5">
          <div className="text-lg font-semibold">Details</div>

          {!selected ? (
            <div className="mt-4 text-sm text-zinc-400">Wähle links ein Wäschestück aus.</div>
          ) : (
            <>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-zinc-400">System-ID</div>
                  <div className="font-medium">{selected.systemId}</div>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-zinc-400">Kategorie</div>
                  <div className="font-medium">{selected.kategorie}</div>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-zinc-400">Größe</div>
                  <div className="font-medium">{selected.groesse}</div>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-zinc-400">Barcode</div>
                  <div className="font-medium font-mono text-xs">{selected.barcode}</div>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-zinc-400">CWS</div>
                  <div className="font-medium">{selected.cws ? "Ja" : "Nein"}</div>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-zinc-400">Status</div>
                  <div className="font-medium">
                    <span
                      className={
                        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium " +
                        statusBadgeClass(selected.status)
                      }
                    >
                      {statusLabel(selected.status)}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-white/10">
                  <div className="text-zinc-400 mb-1">Bemerkung</div>
                  <div className="whitespace-pre-wrap">{selected.bemerkung ?? "—"}</div>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-white/10">
                  <div className="text-zinc-400 mb-1">Einlagerung</div>
                  <div className="text-xs text-zinc-300">{fmtDateTime(selected.eingelagertAm)}</div>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-white/10">
                  <div className="text-zinc-400 mb-1">Ausgabe</div>
                  <div className="text-xs text-zinc-300">
                    <div>Ausgetragen von: {selected.ausgetragenVon ?? "—"}</div>
                    <div>Ausgegeben an: {selected.ausgegebenAn ?? "—"}</div>
                    <div>Datum: {fmtDateTime(selected.ausgabeDatum)}</div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-white/10">
                  <div className="text-zinc-400 mb-1">Angelegt</div>
                  <div className="text-xs text-zinc-300">{fmtDateTime(selected.createdAt)}</div>
                </div>
              </div>

              <button
                className="mt-5 w-full rounded-xl border border-slate-300 bg-slate-50 dark:border-white/10 dark:bg-white/10 px-4 py-2 hover:bg-slate-100 dark:hover:bg-white/15"
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
          item={selected}
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
          const parsed = parseWaescheCsvRows(rows);
          if (!parsed.items.length) {
            alert(parsed.errors[0] ?? "Keine importierbaren Zeilen gefunden.");
            return;
          }

          const res = await fetch("/api/waesche/neu-bulk", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ items: parsed.items }),
          });
          const json = await res.json().catch(() => null);
          if (!json?.ok) {
            alert(json?.error ?? "CSV-Import fehlgeschlagen");
            return;
          }

          const created = Array.isArray(json.createdRows) ? json.createdRows.length : 0;
          const skipped = typeof json.skippedExisting === "number" ? json.skippedExisting : 0;
          alert(`CSV importiert: ${created} neu angelegt${skipped ? `, ${skipped} übersprungen` : ""}.`);
          await reload();
        }}
      />

      <MonthlyReportModal
        open={monthlyReportOpen}
        onClose={() => setMonthlyReportOpen(false)}
        items={items}
      />
    </div>
  );
}
