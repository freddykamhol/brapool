"use client";

import { useEffect, useMemo, useState } from "react";
import WaescheEditModal from "@/app/components/WaescheEditModal";

type WaescheStatus = "EINGELAGERT" | "UMLAUF" | "DEFEKT_REPARATUR" | "DEFEKT_ENTSORGT";
type LogSeverity = "ROT" | "GELB" | "GRUEN" | "INFO";

type WaescheLog = {
  id: string;
  type: string;
  severity: LogSeverity;
  message: string;
  createdAt: string;
  waescheSystemId: number | null;
};

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
  updatedAt: string;
};

const TABLE_PAGE_SIZE = 10;

function statusBadgeClasses(s: WaescheStatus) {
  switch (s) {
    case "EINGELAGERT":
      return "border border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-green-500/40 dark:bg-green-500/15 dark:text-green-200";
    case "UMLAUF":
      return "border border-amber-300 bg-amber-50 text-amber-800 dark:border-yellow-500/40 dark:bg-yellow-500/15 dark:text-yellow-200";
    case "DEFEKT_REPARATUR":
      return "border border-red-300 bg-red-50 text-red-800 dark:border-red-500/40 dark:bg-red-500/15 dark:text-red-200";
    case "DEFEKT_ENTSORGT":
      return "border border-slate-300 bg-slate-100 text-slate-700 dark:border-white/10 dark:bg-black/40 dark:text-white/80";
  }
}

function StatusBadge({ status }: { status: WaescheStatus }) {
  return (
    <span className={["inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium", statusBadgeClasses(status)].join(" ")}>
      {statusLabel(status)}
    </span>
  );
}

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

function severityClasses(sev: LogSeverity) {
  switch (sev) {
    case "ROT":
      return "border border-red-300 bg-red-50 dark:border-red-500/40 dark:bg-red-500/10";
    case "GELB":
      return "border border-amber-300 bg-amber-50 dark:border-yellow-500/40 dark:bg-yellow-500/10";
    case "GRUEN":
      return "border border-emerald-300 bg-emerald-50 dark:border-green-500/40 dark:bg-green-500/10";
    default:
      return "border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5";
  }
}

export default function DashboardPage() {
  const [items, setItems] = useState<Waesche[]>([]);
  const [logs, setLogs] = useState<WaescheLog[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const [tablePage, setTablePage] = useState(1);
  const [logsPage, setLogsPage] = useState(1);
  const [logsPages, setLogsPages] = useState(1);
  const [logsBusy, setLogsBusy] = useState(false);

  const selected = useMemo(() => items.find((x) => x.systemId === selectedId) ?? null, [items, selectedId]);

  const stats = useMemo(() => {
    const total = items.length;
    const umlauf = items.filter((x) => x.status === "UMLAUF").length;
    const eingelagert = items.filter((x) => x.status === "EINGELAGERT").length;
    const byKategorie = new Map<WaescheKategorie, number>();
    for (const it of items) {
      byKategorie.set(it.kategorie, (byKategorie.get(it.kategorie) ?? 0) + 1);
    }
    const kategorieStats = Array.from(byKategorie.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([kategorie, count]) => ({ kategorie, count }));
    return { total, umlauf, eingelagert, kategorieStats };
  }, [items]);

  const tablePages = Math.max(1, Math.ceil(items.length / TABLE_PAGE_SIZE));
  const tableRows = useMemo(() => {
    const start = (tablePage - 1) * TABLE_PAGE_SIZE;
    return items.slice(start, start + TABLE_PAGE_SIZE);
  }, [items, tablePage]);

  useEffect(() => {
    if (tablePage > tablePages) setTablePage(tablePages);
  }, [tablePage, tablePages]);

  async function reloadItems() {
    const wRes = await fetch("/api/waesche", { cache: "no-store" });
    const wJson = await wRes.json().catch(() => null);
    if (wJson?.ok && Array.isArray(wJson.items)) {
      setItems(wJson.items);
      if (selectedId === null && wJson.items.length) setSelectedId(wJson.items[0].systemId);
    }
  }

  async function reloadLogs(page: number) {
    setLogsBusy(true);
    try {
      const lRes = await fetch(`/api/logs?page=${page}`, { cache: "no-store" });
      const lJson = await lRes.json().catch(() => null);
      if (lJson?.ok) {
        setLogs(Array.isArray(lJson.logs) ? lJson.logs : []);
        setLogsPage(typeof lJson.page === "number" ? lJson.page : page);
        setLogsPages(typeof lJson.pages === "number" ? lJson.pages : 1);
      }
    } finally {
      setLogsBusy(false);
    }
  }

  async function reloadAll(pageForLogs: number = logsPage) {
    await Promise.all([reloadItems(), reloadLogs(pageForLogs)]);
  }

  useEffect(() => {
    reloadAll(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      void reloadAll(logsPage);
    }, 15000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logsPage]);

  async function deleteReadLogs(ids: string[]) {
    if (!ids.length) return;
    const res = await fetch("/api/logs", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    const json = await res.json().catch(() => null);
    if (!json?.ok) {
      alert(json?.error ?? "Löschen der Benachrichtigungen fehlgeschlagen");
      return;
    }
    await reloadLogs(logsPage);
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="grid grid-cols-12 gap-4">
        <div className="col-span-12 rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/5">
          <div className="text-5xl font-semibold leading-none">{stats.total}</div>
          <div className="mt-2 text-sm text-zinc-400">Gesamtbestand</div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3 lg:grid-cols-5">
            {stats.kategorieStats.map((row) => (
              <div
                key={row.kategorie}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-white/10 dark:bg-white/10"
              >
                <div className="font-semibold text-zinc-200">{row.count}</div>
                <div className="text-zinc-400">{row.kategorie}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="col-span-12 rounded-2xl border border-slate-200 bg-white p-6 md:col-span-6 dark:border-white/10 dark:bg-white/5">
          <div className="text-4xl font-semibold leading-none">{stats.umlauf}</div>
          <div className="mt-2 text-sm text-zinc-400">UMLAUF</div>
        </div>
        <div className="col-span-12 rounded-2xl border border-slate-200 bg-white p-6 md:col-span-6 dark:border-white/10 dark:bg-white/5">
          <div className="text-4xl font-semibold leading-none">{stats.eingelagert}</div>
          <div className="mt-2 text-sm text-zinc-400">EINGELAGERT</div>
        </div>
      </section>

      <div className="grid grid-cols-12 gap-6">
        <section className="col-span-12 overflow-hidden rounded-2xl border border-slate-200 bg-white lg:col-span-9 dark:border-white/10 dark:bg-white/5">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-white/10">
            <div className="text-lg font-semibold">Wäsche</div>
            <div className="text-sm text-zinc-400">{items.length} Einträge</div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 text-zinc-300 dark:border-white/10">
                <tr>
                  <th className="px-5 py-3 text-left font-medium">Kategorie</th>
                  <th className="px-5 py-3 text-left font-medium">Größe</th>
                  <th className="px-5 py-3 text-left font-medium">Barcode</th>
                  <th className="px-5 py-3 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((it) => {
                  const active = it.systemId === selectedId;
                  return (
                    <tr
                      key={it.systemId}
                      className={[
                        "cursor-pointer border-b border-slate-100 hover:bg-slate-50 dark:border-white/5 dark:hover:bg-white/5",
                        active ? "bg-slate-100 dark:bg-white/10" : "",
                      ].join(" ")}
                      onClick={() => setSelectedId(it.systemId)}
                    >
                      <td className="px-5 py-3">{it.kategorie}</td>
                      <td className="px-5 py-3">{it.groesse}</td>
                      <td className="px-5 py-3">{it.barcode}</td>
                      <td className="px-5 py-3">
                        <StatusBadge status={it.status} />
                      </td>
                    </tr>
                  );
                })}
                {!tableRows.length && (
                  <tr>
                    <td className="px-5 py-6 text-zinc-400" colSpan={4}>
                      Noch keine Einträge vorhanden.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3 text-sm dark:border-white/10">
            <div className="text-zinc-400">Seite {tablePage} / {tablePages}</div>
            <div className="flex gap-2">
              <button
                className="rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-100 disabled:opacity-50 dark:border-white/10 dark:hover:bg-white/5"
                onClick={() => setTablePage((p) => Math.max(1, p - 1))}
                disabled={tablePage <= 1}
              >
                Zurück
              </button>
              <button
                className="rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-100 disabled:opacity-50 dark:border-white/10 dark:hover:bg-white/5"
                onClick={() => setTablePage((p) => Math.min(tablePages, p + 1))}
                disabled={tablePage >= tablePages}
              >
                Weiter
              </button>
            </div>
          </div>
        </section>

        <aside className="col-span-12 rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-3 dark:border-white/10 dark:bg-white/5">
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
                  <div className="font-medium">{selected.barcode}</div>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-zinc-400">Status</div>
                  <StatusBadge status={selected.status} />
                </div>
                <div className="border-t border-slate-200 pt-2 dark:border-white/10">
                  <div className="mb-1 text-zinc-400">Bemerkung</div>
                  <div className="whitespace-pre-wrap">{selected.bemerkung ?? "—"}</div>
                </div>
                <div className="border-t border-slate-200 pt-2 dark:border-white/10">
                  <div className="mb-1 text-zinc-400">Ausgabe</div>
                  <div className="text-xs text-zinc-300">
                    <div>Ausgetragen von: {selected.ausgetragenVon ?? "—"}</div>
                    <div>Ausgegeben an: {selected.ausgegebenAn ?? "—"}</div>
                    <div>Datum: {fmtDateTime(selected.ausgabeDatum)}</div>
                  </div>
                </div>
              </div>

              <button
                className="mt-5 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2 hover:bg-slate-100 dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15"
                onClick={() => setEditOpen(true)}
              >
                Bearbeiten
              </button>

              <button
                className="mt-3 w-full rounded-xl border border-slate-300 px-4 py-2 hover:bg-slate-100 dark:border-white/10 dark:hover:bg-white/5"
                onClick={() => void reloadAll(logsPage)}
              >
                Aktualisieren
              </button>
            </>
          )}
        </aside>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-white/10">
          <div className="text-lg font-semibold">Benachrichtigungen</div>
          <div className="text-sm text-zinc-400">Seite {logsPage} / {logsPages}</div>
        </div>

        <div className="space-y-3 p-5">
          {logs.map((l) => (
            <div key={l.id} className={`rounded-xl p-4 ${severityClasses(l.severity)}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="text-sm">{l.message}</div>
                <div className="shrink-0 text-right">
                  <div className="whitespace-nowrap text-xs text-zinc-400">{fmtDateTime(l.createdAt)}</div>
                  <button
                    className="mt-2 rounded-lg border border-slate-300 bg-slate-50 px-2 py-1 text-xs hover:bg-slate-100 dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15"
                    onClick={() => void deleteReadLogs([l.id])}
                  >
                    Gelesen
                  </button>
                </div>
              </div>
            </div>
          ))}
          {!logs.length && (
            <div className="text-sm text-zinc-400">Keine Benachrichtigungen vorhanden.</div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3 text-sm dark:border-white/10">
          <button
            className="rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-100 disabled:opacity-50 dark:border-white/10 dark:hover:bg-white/5"
            onClick={() => void deleteReadLogs(logs.map((l) => l.id))}
            disabled={!logs.length || logsBusy}
          >
            Alle sichtbaren als gelesen löschen
          </button>
          <div className="flex gap-2">
            <button
              className="rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-100 disabled:opacity-50 dark:border-white/10 dark:hover:bg-white/5"
              onClick={() => void reloadLogs(Math.max(1, logsPage - 1))}
              disabled={logsPage <= 1 || logsBusy}
            >
              Zurück
            </button>
            <button
              className="rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-100 disabled:opacity-50 dark:border-white/10 dark:hover:bg-white/5"
              onClick={() => void reloadLogs(Math.min(logsPages, logsPage + 1))}
              disabled={logsPage >= logsPages || logsBusy}
            >
              Weiter
            </button>
          </div>
        </div>
      </section>

      {selected && (
        <WaescheEditModal
          open={editOpen}
          item={selected}
          onClose={() => setEditOpen(false)}
          onSaved={() => void reloadAll(logsPage)}
        />
      )}
    </div>
  );
}
