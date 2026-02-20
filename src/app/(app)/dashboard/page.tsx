"use client";

import { useEffect, useMemo, useState } from "react";
import WaescheEditModal from "@/app/components/WaescheEditModal";

type WaescheStatus = "EINGELAGERT" | "UMLAUF" | "DEFEKT_REPARATUR" | "DEFEKT_ENTSORGT";
type LogSeverity = "ROT" | "GELB" | "GRUEN" | "INFO";

function statusBadgeClasses(s: WaescheStatus) {
  switch (s) {
    case "EINGELAGERT":
      return "bg-green-500/15 border-green-500/40 text-green-200";
    case "UMLAUF":
      return "bg-yellow-500/15 border-yellow-500/40 text-yellow-200";
    case "DEFEKT_REPARATUR":
      return "bg-red-500/15 border-red-500/40 text-red-200";
    case "DEFEKT_ENTSORGT":
      return "bg-black/40 border-white/10 text-white/80";
  }
}

function StatusBadge({ status }: { status: WaescheStatus }) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
        statusBadgeClasses(status),
      ].join(" ")}
    >
      {statusLabel(status)}
    </span>
  );
}

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
  status: WaescheStatus;
  bemerkung: string | null;

  eingelagertAm: string | null;
  ausgetragenVon: string | null;
  ausgegebenAn: string | null;
  ausgabeDatum: string | null;

  createdAt: string;
  updatedAt: string;
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

function severityClasses(sev: LogSeverity) {
  switch (sev) {
    case "ROT":
      return "border border-red-500/40 bg-red-500/10";
    case "GELB":
      return "border border-yellow-500/40 bg-yellow-500/10";
    case "GRUEN":
      return "border border-green-500/40 bg-green-500/10";
    default:
      return "border border-white/10 bg-white/5";
  }
}

function weeksSince(iso: string | null | undefined) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const diff = Date.now() - d.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 7));
}

export default function DashboardPage() {
  const [items, setItems] = useState<Waesche[]>([]);
  const [logs, setLogs] = useState<WaescheLog[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const selected = useMemo(
    () => items.find((x) => x.systemId === selectedId) ?? null,
    [items, selectedId]
  );

  async function reload() {
    const [wRes, lRes] = await Promise.all([
      fetch("/api/waesche", { cache: "no-store" }),
      fetch("/api/logs", { cache: "no-store" }),
    ]);

    const wJson = await wRes.json().catch(() => null);
    const lJson = await lRes.json().catch(() => null);

    if (wJson?.ok) {
      setItems(wJson.items);
      if (selectedId === null && wJson.items.length) setSelectedId(wJson.items[0].systemId);
    }

    if (lJson?.ok) setLogs(lJson.logs);
  }

  useEffect(() => {
    reload();
    // optional: live refresh alle 15s
    const t = setInterval(reload, 15000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // GELB: Umlauf > 6 Wochen (dynamisch, ohne DB-Log nötig)
  const umlaufWarnings = useMemo(() => {
    const warns: WaescheLog[] = [];
    for (const it of items) {
      if (it.status === "UMLAUF") {
        const base = it.ausgabeDatum ?? it.updatedAt;
        const w = weeksSince(base);
        if (w !== null && w >= 6) {
          warns.push({
            id: `umlauf-${it.systemId}`,
            type: "UMLAUF_WARNUNG",
            severity: "GELB",
            message: `Kat ${it.kategorie} mit Barcode ${it.barcode} ist seit ${w} Wochen im Status „UMLAUF“.`,
            createdAt: base ?? new Date().toISOString(),
            waescheSystemId: it.systemId,
          });
        }
      }
    }
    return warns;
  }, [items]);

  const mergedLogs = useMemo(() => {
    const all = [...umlaufWarnings, ...logs];
    all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return all.slice(0, 40);
  }, [umlaufWarnings, logs]);

  return (
    <div className="flex flex-col gap-6">
      {/* Top: 3/4 Tabelle + 1/4 Details */}
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
                      <td className="px-5 py-3">{it.barcode}</td>
                      <td className="px-5 py-3">
  <StatusBadge status={it.status} />
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
                  <div className="font-medium">{selected.barcode}</div>
                </div>
                <div className="flex items-center justify-between gap-3">
  <div className="opacity-70">Status</div>
  <StatusBadge status={selected.status} />
</div>
                <div className="pt-2 border-t border-white/10">
                  <div className="opacity-70 mb-1">Bemerkung</div>
                  <div className="whitespace-pre-wrap">{selected.bemerkung ?? "—"}</div>
                </div>

                <div className="pt-2 border-t border-white/10">
                  <div className="opacity-70 mb-1">Ausgabe</div>
                  <div className="text-xs opacity-80">
                    <div>Ausgetragen von: {selected.ausgetragenVon ?? "—"}</div>
                    <div>Ausgegeben an: {selected.ausgegebenAn ?? "—"}</div>
                    <div>Datum: {fmtDateTime(selected.ausgabeDatum)}</div>
                  </div>
                </div>
              </div>

              <button
                className="mt-5 w-full rounded-xl border border-white/10 bg-white/10 px-4 py-2 hover:bg-white/15"
                onClick={() => setEditOpen(true)}
              >
                Bearbeiten
              </button>

              <button
                className="mt-3 w-full rounded-xl border border-white/10 px-4 py-2 hover:bg-white/5"
                onClick={reload}
              >
                Aktualisieren
              </button>
            </>
          )}
        </aside>
      </div>

      {/* Bottom: Logs / Benachrichtigungen full width */}
      <section className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="text-lg font-semibold">Log / Benachrichtigungen</div>
          <div className="text-sm opacity-70">{mergedLogs.length} Einträge</div>
        </div>

        <div className="p-5 space-y-3">
          {mergedLogs.map((l) => (
            <div key={l.id} className={`rounded-xl p-4 ${severityClasses(l.severity)}`}>
              <div className="flex items-center justify-between gap-4">
                <div className="text-sm">{l.message}</div>
                <div className="text-xs opacity-70 whitespace-nowrap">{fmtDateTime(l.createdAt)}</div>
              </div>
            </div>
          ))}

          {!mergedLogs.length && (
            <div className="text-sm opacity-70">Noch keine Logs vorhanden.</div>
          )}
        </div>
      </section>

      {selected && (
        <WaescheEditModal
          open={editOpen}
          item={selected}
          onClose={() => setEditOpen(false)}
          onSaved={reload}
        />
      )}
    </div>
  );
}