"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import EinlagernNeuModal from "@/app/components/EinlagernNeuModal";
import CsvImportModal from "@/app/components/CsvImportModal";

function parseBarcodes(text: string): string[] {
  // akzeptiert neue Zeilen, Komma, Semikolon, Leerzeichen
  const parts = text
    .split(/[\n,; \t]+/g)
    .map((x) => x.trim())
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

function playBeep() {
  try {
    const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = 880;
    g.gain.value = 0.04;
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    setTimeout(() => {
      o.stop();
      ctx.close?.();
    }, 80);
  } catch {
    // ignore
  }
  
}

function ScannerModal(props: {
  open: boolean;
  onClose: () => void;
  onScanned: (barcode: string) => void;
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
  const qrRef = useRef<any>(null);
  

  useEffect(() => {
    if (!open) return;

    let stopped = false;
    setHistory([]);
    setTorchSupported(false);
    setTorchOn(false);

    async function start() {
      setStatus("Kamera wird gestartet …");

      // dynamic import to avoid SSR/Turbopack issues
      const mod = await import("html5-qrcode");
      const Html5Qrcode = (mod as any).Html5Qrcode;

      const id = "brapool-scanner";
      const scanner = new Html5Qrcode(id);
      qrRef.current = scanner;

      const config = {
        fps: 12,
        qrbox: { width: 260, height: 160 }, // works for 1D/2D; you can tweak
        rememberLastUsedCamera: true,
        formatsToSupport: undefined,
      } as any;

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

            setLast(code);
            setStatus("Erfasst ✓");
            onScanned(code);
            playBeep();
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
                if (!stopped) scanner.resume();
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
          const caps = await (scanner as any).getRunningTrackCapabilities?.();
          const supports = !!caps?.torch;
          setTorchSupported(supports);
        } catch {
          setTorchSupported(false);
        }

        setReady(true);
        setStatus("Bereit – scanne Barcodes …");
      } catch (e: any) {
        setStatus(e?.message ?? "Kamera konnte nicht gestartet werden.");
      }
    }

    start();

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
  }, [open, onScanned]);

  async function toggleTorch() {
    if (!torchSupported) return;
    const scanner = qrRef.current;
    if (!scanner) return;
    const next = !torchOn;
    try {
      await (scanner as any).applyVideoConstraints?.({ advanced: [{ torch: next }] });
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
      return prev.slice(1);
    });
  }

  function removeOne(code: string) {
    onRemove(code);
    setHistory((prev) => prev.filter((x) => x !== code));
  }

  function clearAll() {
    // remove all from textarea
    setHistory((prev) => {
      for (const c of prev) onRemove(c);
      return [];
    });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-3xl rounded-2xl border border-white/10 bg-zinc-950 p-6">
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold">Barcode Scanner</div>
          <button className="rounded-xl border border-white/10 px-3 py-1.5 hover:bg-white/5" onClick={onClose}>
            Schließen
          </button>
        </div>

        <div className="mt-4 grid grid-cols-12 gap-4">
          <div className="col-span-12 lg:col-span-8">
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-black">
              <div id="brapool-scanner" className="w-full" />
            </div>
            <div className="mt-3 text-xs opacity-70">
              Tipp: Halte den Barcode ruhig in die Mitte. Der Scanner bleibt aktiv, bis du ihn schließt.
            </div>
          </div>

          <div className="col-span-12 lg:col-span-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm font-medium">Status</div>
              <div className="mt-2 text-sm opacity-80">{status || "…"}</div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <div className="text-sm font-medium">Blitz</div>
                <button
                  className={
                    "rounded-xl border px-3 py-1.5 text-xs transition-colors " +
                    (torchSupported
                      ? "border-white/10 bg-white/10 hover:bg-white/15"
                      : "border-white/10 bg-white/5 opacity-50 cursor-not-allowed")
                  }
                  onClick={toggleTorch}
                  disabled={!torchSupported}
                >
                  {torchOn ? "An" : "Aus"}
                </button>
              </div>

              <div className="mt-4 text-sm font-medium">Letzter Scan</div>
              <div className="mt-2 rounded-xl border border-white/10 bg-white/5 p-3 font-mono text-xs">
                {last || "—"}
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm font-medium">Historie</div>
                <div className="text-xs opacity-70">{history.length}</div>
              </div>

              <div className="mt-2 space-y-2">
                <div className="flex gap-2">
                  <button
                    className={
                      "w-full rounded-xl border border-white/10 px-3 py-2 text-xs hover:bg-white/10 " +
                      (history.length ? "bg-white/5" : "bg-white/5 opacity-50 cursor-not-allowed")
                    }
                    onClick={undoLast}
                    disabled={!history.length}
                  >
                    Undo letzter
                  </button>
                  <button
                    className={
                      "w-full rounded-xl border border-white/10 px-3 py-2 text-xs hover:bg-white/10 " +
                      (history.length ? "bg-white/5" : "bg-white/5 opacity-50 cursor-not-allowed")
                    }
                    onClick={clearAll}
                    disabled={!history.length}
                  >
                    Alles entfernen
                  </button>
                </div>

                <div className="max-h-[180px] overflow-y-auto rounded-2xl border border-white/10 bg-white/5">
                  {history.length === 0 ? (
                    <div className="p-3 text-xs opacity-70">Noch keine Scans.</div>
                  ) : (
                    history.map((h) => (
                      <div key={h} className="flex items-center justify-between gap-2 border-b border-white/5 p-3">
                        <div className="min-w-0 font-mono text-[11px] truncate">{h}</div>
                        <button
                          className="shrink-0 rounded-lg border border-white/10 bg-white/10 px-2 py-1 text-[11px] hover:bg-white/15"
                          onClick={() => removeOne(h)}
                        >
                          Entfernen
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="mt-4 text-xs opacity-70">
                {ready ? "Automatisch: Scan → Hinweis → neue Zeile." : ""}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
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
        const preview = missingList.slice(0, 8).join(", ");
        const more = missingList.length > 8 ? ` … (+${missingList.length - 8})` : "";
        const ok = window.confirm(`${preview}${more} neu anlegen?`);

        if (ok) {
          setMissing(missingList);
          setModalOpen(true);
        }
      } else {
        alert(`Eingelagert: ${json.updatedCount}`);
        setInput("");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-12 lg:col-span-9">
        <div className="max-w-3xl">
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
          setInput((cur) => mergeBarcodeIntoTextarea(cur, code));
        }}
        onRemove={(code) => {
          setInput((cur) => removeBarcodeFromTextarea(cur, code));
        }}
      />

      <CsvImportModal
  open={csvOpen}
  onClose={() => setCsvOpen(false)}
  onConfirmImport={async (rows) => {
    // API kommt später – aktuell nur Vorschau/Parsing.
    console.log("CSV rows", rows);
  }}
/>
    </div>
  );
}