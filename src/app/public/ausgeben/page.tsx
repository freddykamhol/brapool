"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ModalShell from "@/app/components/ModalShell";
import { createHtml5Qrcode, playScanBeep, type BarcodeScannerInstance } from "@/app/lib/barcode-scanner";
import { matchIncomingBarcodes, normalizeBarcodeForMatch } from "@/app/lib/barcode";

type WaescheKategorie = "HOSE" | "POLO" | "SWEATJACKE" | "SOFTSHELLJACKE" | "HARDSHELLJACKE";
type WaescheStatus = "EINGELAGERT" | "UMLAUF" | "DEFEKT_REPARATUR" | "DEFEKT_ENTSORGT";

type Waesche = {
  systemId: number;
  barcode: string;
  kategorie: WaescheKategorie;
  groesse: string;
  status: WaescheStatus;
};

function parseBarcodes(text: string): string[] {
  const parts = text
    .split(/[\n,; \t]+/g)
    .map((x) => normalizeBarcodeForMatch(x))
    .filter(Boolean);
  return Array.from(new Set(parts));
}

function mergeBarcodeIntoTextarea(current: string, barcode: string) {
  const existing = new Set(parseBarcodes(current));
  if (existing.has(barcode)) return current;
  const trimmed = current.replace(/[\s\n]+$/g, "");
  return trimmed ? `${trimmed}\n${barcode}\n` : `${barcode}\n`;
}

function removeBarcodeFromTextarea(current: string, barcode: string) {
  const lines = current
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const filtered = lines.filter((l) => l !== barcode);
  return filtered.length ? filtered.join("\n") + "\n" : "";
}

function ScannerModal(props: {
  open: boolean;
  onClose: () => void;
  onScanned: (barcode: string) => boolean;
  onRemove: (barcode: string) => void;
}) {
  const { open, onClose, onScanned, onRemove } = props;
  const [status, setStatus] = useState<string>("");
  const [last, setLast] = useState<string>("");
  const [ready, setReady] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  const lastScanRef = useRef<{ code: string; at: number }>({ code: "", at: 0 });
  const qrRef = useRef<BarcodeScannerInstance | null>(null);
  const seenCodesRef = useRef<Set<string>>(new Set());
  const onScannedRef = useRef(onScanned);

  useEffect(() => {
    onScannedRef.current = onScanned;
  }, [onScanned]);

  useEffect(() => {
    if (!open) return;
    let stopped = false;

    async function start() {
      setHistory([]);
      seenCodesRef.current = new Set();
      lastScanRef.current = { code: "", at: 0 };
      setTorchSupported(false);
      setTorchOn(false);
      setStatus("Kamera wird gestartet …");

      const id = "brapool-scanner-ausgeben";
      const scanner = await createHtml5Qrcode(id);
      if (stopped) {
        try {
          scanner.clear();
        } catch {
          // ignore
        }
        return;
      }
      qrRef.current = scanner;

      const config = {
        fps: 12,
        qrbox: { width: 260, height: 160 },
        rememberLastUsedCamera: true,
      };

      try {
        await scanner.start(
          { facingMode: "environment" },
          config,
          async (decodedText: string) => {
            const code = (decodedText ?? "").trim();
            if (!code) return;

            const now = Date.now();
            const prev = lastScanRef.current;
            if (prev.code === code && now - prev.at < 1200) return;
            lastScanRef.current = { code, at: now };

            if (seenCodesRef.current.has(code)) {
              setStatus(`Bereits erfasst: ${code}`);
              return;
            }

            const accepted = onScannedRef.current(code);
            if (!accepted) {
              setStatus(`Bereits vorhanden: ${code}`);
              return;
            }

            seenCodesRef.current.add(code);
            setLast(code);
            setStatus("Erfasst ✓");
            void playScanBeep();
            try {
              if (navigator.vibrate) navigator.vibrate(20);
            } catch {
              // ignore
            }

            setHistory((prevH) => {
              if (prevH[0] === code) return prevH;
              const next = [code, ...prevH.filter((x) => x !== code)];
              return next.slice(0, 30);
            });

            try {
              await scanner.pause(true);
              setTimeout(() => {
                if (!stopped) void scanner.resume();
              }, 450);
            } catch {
              // ignore
            }
          },
          () => {
            // ignore
          }
        );

        try {
          const caps = await scanner.getRunningTrackCapabilities?.();
          const supports = !!caps?.torch;
          setTorchSupported(supports);
        } catch {
          setTorchSupported(false);
        }

        setReady(true);
        setStatus("Bereit – scanne Barcodes …");
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Kamera konnte nicht gestartet werden.";
        setStatus(message);
      }
    }

    void start();

    return () => {
      stopped = true;
      setReady(false);
      setStatus("");
      setLast("");

      const scanner = qrRef.current;
      qrRef.current = null;

      if (scanner) {
        scanner
          .stop()
          .catch(() => null)
          .finally(() => {
            try {
              scanner.clear();
            } catch {
              // ignore
            }
          });
      }
    };
  }, [open]);

  async function toggleTorch() {
    if (!torchSupported) return;
    const scanner = qrRef.current;
    if (!scanner) return;
    const next = !torchOn;
    try {
      await scanner.applyVideoConstraints?.({ advanced: [{ torch: next }] } as unknown as MediaTrackConstraints);
      setTorchOn(next);
      setStatus(next ? "Blitz an" : "Blitz aus");
    } catch {
      setStatus("Blitz wird vom Gerät nicht unterstützt");
      setTorchOn(false);
    }
  }

  function undoLast() {
    setHistory((prev) => {
      const first = prev[0];
      if (!first) return prev;
      onRemove(first);
      seenCodesRef.current.delete(first);
      return prev.slice(1);
    });
  }

  function removeOne(code: string) {
    onRemove(code);
    seenCodesRef.current.delete(code);
    setHistory((prev) => prev.filter((x) => x !== code));
  }

  function clearAll() {
    setHistory((prev) => {
      for (const c of prev) {
        onRemove(c);
        seenCodesRef.current.delete(c);
      }
      return [];
    });
  }

  if (!open) return null;

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      containerClassName="p-3 sm:p-4"
      panelClassName="max-w-3xl rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-xl dark:border-white/10 dark:bg-slate-900/70 dark:backdrop-blur"
    >
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold">Barcode Scanner</div>
          <button className="rounded-xl border border-slate-300 px-3 py-1.5 hover:bg-slate-100 dark:border-white/10 dark:hover:bg-white/5" onClick={onClose}>
            Schließen
          </button>
        </div>

        <div className="mt-4 grid grid-cols-12 gap-4">
          <div className="col-span-12 lg:col-span-8">
            <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-black">
              <div id="brapool-scanner-ausgeben" className="w-full" />
            </div>
            <div className="mt-3 text-xs text-zinc-400">Tipp: Barcode ruhig in die Mitte. Scanner bleibt aktiv bis du schließt.</div>
          </div>

          <div className="col-span-12 lg:col-span-4">
            <div className="rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5 p-4">
              <div className="text-sm font-medium">Status</div>
              <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">{status || "…"}</div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <div className="text-sm font-medium">Blitz</div>
                <button
                  className={
                    "rounded-xl border px-3 py-1.5 text-xs transition-colors " +
                    (torchSupported
                      ? "border-slate-300 bg-slate-50 dark:border-white/10 dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/15"
                      : "border-slate-200 bg-white dark:border-white/10 dark:bg-white/5 opacity-50 cursor-not-allowed")
                  }
                  onClick={toggleTorch}
                  disabled={!torchSupported}
                >
                  {torchOn ? "An" : "Aus"}
                </button>
              </div>

              <div className="mt-4 text-sm font-medium">Letzter Scan</div>
              <div className="mt-2 rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5 p-3 font-mono text-xs">{last || "—"}</div>

              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm font-medium">Historie</div>
                <div className="text-xs text-zinc-400">{history.length}</div>
              </div>

              <div className="mt-2 space-y-2">
                <div className="flex gap-2">
                  <button
                    className={
                      "w-full rounded-xl border border-slate-300 dark:border-white/10 px-3 py-2 text-xs hover:bg-slate-100 dark:hover:bg-white/10 " +
                      (history.length ? "bg-slate-50 dark:bg-white/10" : "bg-slate-50 dark:bg-white/10 opacity-50 cursor-not-allowed")
                    }
                    onClick={undoLast}
                    disabled={!history.length}
                  >
                    Undo letzter
                  </button>
                  <button
                    className={
                      "w-full rounded-xl border border-slate-300 dark:border-white/10 px-3 py-2 text-xs hover:bg-slate-100 dark:hover:bg-white/10 " +
                      (history.length ? "bg-slate-50 dark:bg-white/10" : "bg-slate-50 dark:bg-white/10 opacity-50 cursor-not-allowed")
                    }
                    onClick={clearAll}
                    disabled={!history.length}
                  >
                    Alles entfernen
                  </button>
                </div>

                <div className="max-h-[180px] overflow-y-auto rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5">
                  {history.length === 0 ? (
                    <div className="p-3 text-xs text-zinc-400">Noch keine Scans.</div>
                  ) : (
                    history.map((h) => (
                      <div key={h} className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-white/5 p-3">
                        <div className="min-w-0 font-mono text-[11px] truncate">{h}</div>
                        <button
                          className="shrink-0 rounded-lg border border-slate-300 bg-slate-50 dark:border-white/10 dark:bg-white/10 px-2 py-1 text-[11px] hover:bg-slate-100 dark:hover:bg-white/15"
                          onClick={() => removeOne(h)}
                        >
                          Entfernen
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="mt-4 text-xs text-zinc-400">{ready ? "Automatisch: Scan → Hinweis → neue Zeile." : ""}</div>
            </div>
          </div>
        </div>
    </ModalShell>
  );
}

export default function AusgebenPage() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);

  const [ausgetragenVon, setAusgetragenVon] = useState("");
  const [ausgegebenAn, setAusgegebenAn] = useState("");

  const [resolved, setResolved] = useState<Map<string, Waesche>>(new Map());
  const [resolveLoading, setResolveLoading] = useState(false);

  const barcodes = useMemo(() => parseBarcodes(input), [input]);
  const barcodeSet = useMemo(() => new Set(barcodes), [barcodes]);
  const barcodeSetRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    barcodeSetRef.current = barcodeSet;
  }, [barcodeSet]);
  const canSubmit = barcodes.length > 0 && !loading && ausgetragenVon.trim() && ausgegebenAn.trim();

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      if (!barcodes.length) {
        setResolved(new Map());
        return;
      }
      setResolveLoading(true);
      try {
        const res = await fetch("/api/waesche", { cache: "no-store" });
        const json = await res.json().catch(() => null);
        if (!json?.ok || !Array.isArray(json.items)) return;
        if (cancelled) return;

        const storedRows = json.items as Waesche[];
        const { matched } = matchIncomingBarcodes(barcodes, storedRows);
        const byNormalized = new Map<string, Waesche>();
        for (const row of matched) {
          const key = normalizeBarcodeForMatch(row.barcode);
          if (key && !byNormalized.has(key)) byNormalized.set(key, row);
        }

        const filtered = new Map<string, Waesche>();
        for (const bc of barcodes) {
          const item = byNormalized.get(normalizeBarcodeForMatch(bc));
          if (item) filtered.set(bc, item);
        }
        setResolved(filtered);
      } finally {
        if (!cancelled) setResolveLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [barcodes]);

  const summary = useMemo(() => {
    const counts = new Map<string, number>();
    for (const bc of barcodes) {
      const it = resolved.get(bc);
      if (!it) continue;
      const key = `${it.kategorie} ${it.groesse}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([key, n]) => ({ label: key, n }));
  }, [barcodes, resolved]);

  const missing = useMemo(() => {
    const miss: string[] = [];
    for (const bc of barcodes) {
      if (!resolved.has(bc)) miss.push(bc);
    }
    return miss;
  }, [barcodes, resolved]);

  async function ausgeben() {
    if (!canSubmit) return;

    setLoading(true);
    try {
      const res = await fetch("/api/waesche/ausgeben", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barcodes,
          ausgetragenVon: ausgetragenVon.trim(),
          ausgegebenAn: ausgegebenAn.trim(),
        }),
      });

      const json = await res.json().catch(() => null);
      if (!json?.ok) {
        alert(json?.error ?? "Ausgeben fehlgeschlagen");
        return;
      }

      const missingList: string[] = json.missing ?? [];
      if (missingList.length) {
        const preview = missingList.slice(0, 8).join(", ");
        const more = missingList.length > 8 ? ` … (+${missingList.length - 8})` : "";
        alert(`Nicht vorhanden (bitte erst anlegen): ${preview}${more}`);
      } else {
        alert(`Ausgegeben (UMLAUF): ${json.updatedCount}`);
        setInput("");
        setResolved(new Map());
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-12 gap-4 md:gap-6">
      <div className="order-1 col-span-12 w-full">
        <section className="space-y-5">
          <div className="text-2xl font-semibold">Ausgeben</div>
          <div className="mt-2 text-sm text-zinc-400">Barcodes einfügen/scannen und ausgeben. Status wird auf UMLAUF gesetzt.</div>
          <div className="mt-4">
            <button
              className="w-full sm:w-auto rounded-xl border border-slate-300 bg-slate-50 dark:border-white/10 dark:bg-white/10 px-4 py-3 text-sm font-medium hover:bg-slate-100 dark:hover:bg-white/15"
              onClick={() => setScannerOpen(true)}
            >
              Kamera-Scanner starten
            </button>
          </div>

          <form
            className="mt-5 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void ausgeben();
            }}
          >
            <div className="grid grid-cols-12 gap-3 sm:gap-4">
              <div className="col-span-12 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/5 md:col-span-6">
                <label className="mb-2 block text-sm font-medium">Ausgabe durch</label>
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5 p-3.5 text-sm"
                  value={ausgetragenVon}
                  onChange={(e) => setAusgetragenVon(e.target.value)}
                  placeholder="z.B. Alex Becker"
                />
              </div>
              <div className="col-span-12 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/5 md:col-span-6">
                <label className="mb-2 block text-sm font-medium">Ausgabe an</label>
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5 p-3.5 text-sm"
                  value={ausgegebenAn}
                  onChange={(e) => setAusgegebenAn(e.target.value)}
                  placeholder="z.B. Wache 2 / Max Mustermann"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/5 sm:p-5">
              <label className="mb-2 block text-sm font-medium">Barcodes</label>
              <textarea
                className="w-full min-h-[180px] sm:min-h-[240px] rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5 p-4 font-mono text-sm"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={"BRA-0001\nBRA-0002\nBRA-0003"}
              />

              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs text-zinc-400">
                  {barcodes.length} eindeutige Barcodes erkannt{resolveLoading ? " • prüfe…" : ""}
                </div>
                <button
                  type="submit"
                  className="w-full sm:w-auto rounded-xl border border-slate-300 bg-slate-50 dark:border-white/10 dark:bg-white/10 px-5 py-3 text-sm font-medium hover:bg-slate-100 dark:hover:bg-white/15 disabled:opacity-50"
                  disabled={!canSubmit}
                >
                  {loading ? "Ausgeben..." : "Ausgeben"}
                </button>
              </div>
            </div>
          </form>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/70 dark:border-white/10 dark:bg-white/5">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 px-5 py-4">
              <div className="text-lg font-semibold">Zusammenfassung</div>
              <div className="text-sm text-zinc-400">{summary.reduce((a, s) => a + s.n, 0)} erkannt</div>
            </div>

            <div className="p-5 space-y-2">
              {summary.length ? (
                summary.map((s) => (
                  <div key={s.label} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/10 px-4 py-3">
                    <div className="text-sm font-medium">{s.n}x</div>
                    <div className="min-w-0 flex-1 text-sm text-zinc-200 truncate">{s.label}</div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-zinc-400">Noch keine passenden Einträge erkannt.</div>
              )}

              {missing.length > 0 && (
                <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-yellow-500/30 dark:bg-yellow-500/10 dark:text-yellow-100">
                  <div className="font-medium">Nicht gefunden</div>
                  <div className="mt-1 text-xs text-zinc-300">
                    {missing.slice(0, 10).join(", ")}
                    {missing.length > 10 ? ` … (+${missing.length - 10})` : ""}
                  </div>
                  <div className="mt-2 text-xs text-zinc-400">Diese Barcodes musst du erst in der Datenbank anlegen.</div>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      <ScannerModal
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanned={(code) => {
          if (barcodeSetRef.current.has(code)) return false;
          setInput((cur) => mergeBarcodeIntoTextarea(cur, code));
          return true;
        }}
        onRemove={(code) => setInput((cur) => removeBarcodeFromTextarea(cur, code))}
      />
    </div>
  );
}
