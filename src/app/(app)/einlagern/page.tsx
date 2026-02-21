"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import EinlagernNeuModal from "@/app/components/EinlagernNeuModal";
import CsvImportModal from "@/app/components/CsvImportModal";
import ModalShell from "@/app/components/ModalShell";
import { createHtml5Qrcode, playScanBeep, type BarcodeScannerInstance } from "@/app/lib/barcode-scanner";
import { normalizeBarcodeForMatch } from "@/app/lib/barcode";
import { parseWaescheCsvRows } from "@/app/lib/waesche-csv";

function parseBarcodes(text: string): string[] {
  // akzeptiert neue Zeilen, Komma, Semikolon, Leerzeichen
  const parts = text
    .split(/[\n,; \t]+/g)
    .map((x) => normalizeBarcodeForMatch(x))
    .filter(Boolean);

  // unique
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
  const seenCodesRef = useRef<Set<string>>(new Set());
  const qrRef = useRef<BarcodeScannerInstance | null>(null);
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

      const id = "brapool-scanner";
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

            // de-dupe & anti-bounce
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

            // keep scanning; brief pause reduces double reads
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
            // ignore per-frame decode errors to keep UI clean
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
        // stop camera cleanly
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
    // remove all from textarea
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
    <ModalShell open={open} onClose={onClose} panelClassName="max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-white/10 dark:bg-slate-900/70 dark:backdrop-blur">
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold">Barcode Scanner</div>
          <button
            className="rounded-xl border border-slate-300 px-3 py-1.5 hover:bg-slate-100 dark:border-white/10 dark:hover:bg-white/5"
            onClick={onClose}
          >
            Schließen
          </button>
        </div>

        <div className="mt-4 grid grid-cols-12 gap-4">
          <div className="col-span-12 lg:col-span-8">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-black dark:border-white/10">
              <div id="brapool-scanner" className="w-full" />
            </div>
            <div className="mt-3 text-xs text-zinc-400">
              Tipp: Halte den Barcode ruhig in die Mitte. Der Scanner bleibt aktiv, bis du ihn schließt.
            </div>
          </div>

          <div className="col-span-12 lg:col-span-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
              <div className="text-sm font-medium">Status</div>
              <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">{status || "…"}</div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <div className="text-sm font-medium">Blitz</div>
                <button
                  className={
                    "rounded-xl border px-3 py-1.5 text-xs transition-colors " +
                    (torchSupported
                      ? "border-slate-300 bg-slate-50 hover:bg-slate-100 dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15"
                      : "border-slate-200 bg-white opacity-50 cursor-not-allowed dark:border-white/10 dark:bg-white/5")
                  }
                  onClick={toggleTorch}
                  disabled={!torchSupported}
                >
                  {torchOn ? "An" : "Aus"}
                </button>
              </div>

              <div className="mt-4 text-sm font-medium">Letzter Scan</div>
              <div className="mt-2 rounded-xl border border-slate-200 bg-white p-3 font-mono text-xs dark:border-white/10 dark:bg-white/5">
                {last || "—"}
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm font-medium">Historie</div>
                <div className="text-xs text-zinc-400">{history.length}</div>
              </div>

              <div className="mt-2 space-y-2">
                <div className="flex gap-2">
                  <button
                    className={
                      "w-full rounded-xl border border-slate-300 px-3 py-2 text-xs hover:bg-slate-100 dark:border-white/10 dark:hover:bg-white/10 " +
                      (history.length ? "bg-slate-50 dark:bg-white/10" : "bg-slate-50 dark:bg-white/10 opacity-50 cursor-not-allowed")
                    }
                    onClick={undoLast}
                    disabled={!history.length}
                  >
                    Undo letzter
                  </button>
                  <button
                    className={
                      "w-full rounded-xl border border-slate-300 px-3 py-2 text-xs hover:bg-slate-100 dark:border-white/10 dark:hover:bg-white/10 " +
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
                      <div key={h} className="flex items-center justify-between gap-2 border-b border-slate-100 p-3 dark:border-white/5">
                        <div className="min-w-0 font-mono text-[11px] truncate">{h}</div>
                        <button
                          className="shrink-0 rounded-lg border border-slate-300 bg-slate-50 px-2 py-1 text-[11px] hover:bg-slate-100 dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15"
                          onClick={() => removeOne(h)}
                        >
                          Entfernen
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="mt-4 text-xs text-zinc-400">
                {ready ? "Automatisch: Scan → Hinweis → neue Zeile." : ""}
              </div>
            </div>
          </div>
        </div>
    </ModalShell>
  );
}

export default function EinlagernPage() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const [missing, setMissing] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);

  const barcodes = useMemo(() => parseBarcodes(input), [input]);
  const barcodeSet = useMemo(() => new Set(barcodes), [barcodes]);
  const barcodeSetRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    barcodeSetRef.current = barcodeSet;
  }, [barcodeSet]);

  const canSubmit = barcodes.length > 0 && !loading;

  async function einlagern() {
    if (!canSubmit) return;

    setLoading(true);
    try {
      const res = await fetch("/api/waesche/einlagern", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barcodes }),
      });

      const json = await res.json().catch(() => null);
      if (!json?.ok) {
        alert(json?.error ?? "Einlagern fehlgeschlagen");
        return;
      }

      const missingList: string[] = json.missing ?? [];
      if (missingList.length > 0) {
        setMissing(missingList);
        setModalOpen(true);
      } else {
        alert(`Eingelagert: ${json.updatedCount}`);
        setInput("");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-12 gap-4 md:gap-6">
      <div className="col-span-12 lg:col-span-9">
        <div className="w-full">
          <div className="text-2xl font-semibold">Einlagern</div>
          <div className="mt-2 text-sm opacity-70">
            Barcodes mehrzeilig einfügen (oder mit Komma getrennt). Vorhandene werden eingelagert, fehlende kannst du bulk anlegen.
          </div>

          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="text-sm font-medium mb-2">Barcodes</div>
            <textarea
              className="w-full min-h-[260px] rounded-2xl border border-white/10 bg-white/5 p-4 font-mono text-sm"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={"BRA-0001\nBRA-0002\nBRA-0003"}
            />

            <div className="mt-3 flex items-center justify-between">
              <div className="text-xs opacity-70">{barcodes.length} eindeutige Barcodes erkannt</div>
              <button
                className="rounded-xl border border-white/10 bg-white/10 px-5 py-2 hover:bg-white/15 disabled:opacity-50"
                onClick={einlagern}
                disabled={!canSubmit}
              >
                {loading ? "Einlagern..." : "Einlagern"}
              </button>
            </div>
          </div>

          <EinlagernNeuModal
            open={modalOpen}
            barcodes={missing}
            onClose={() => setModalOpen(false)}
            onCreated={() => {
              setInput("");
              alert(`Neu angelegt & eingelagert: ${missing.length}`);
              setMissing([]);
            }}
          />
        </div>
      </div>

      <aside className="col-span-12 lg:col-span-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-lg font-semibold">Aktionen</div>
          <div className="mt-2 text-sm opacity-70">Schnellzugriffe für Import & Scanner.</div>

          <div className="mt-5 space-y-3">
            <button
  className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-left hover:bg-white/15"
  onClick={() => setCsvOpen(true)}
>
  <div className="text-sm font-medium">CSV Import</div>
  <div className="text-xs opacity-70">Datei auswählen → Vorschau → später Import</div>
</button>

            <button
              className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-left hover:bg-white/15"
              onClick={() => setScannerOpen(true)}
            >
              <div className="text-sm font-medium">Kamera-Scanner</div>
              <div className="text-xs opacity-70">Automatisch scannen → neue Zeile</div>
            </button>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs opacity-70">
              <div className="font-medium text-sm opacity-90 mb-1">Hinweis</div>
              Funktioniert im Browser (auch mobil). Für Android später einfach als PWA installieren.
            </div>
          </div>
        </div>
      </aside>

      <ScannerModal
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanned={(code) => {
          if (barcodeSetRef.current.has(code)) return false;
          setInput((cur) => mergeBarcodeIntoTextarea(cur, code));
          return true;
        }}
        onRemove={(code) => {
          setInput((cur) => removeBarcodeFromTextarea(cur, code));
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
  }}
/>
    </div>
  );
}
