"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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
    .map((x) => x.trim())
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

      const mod = await import("html5-qrcode");
      const Html5Qrcode = (mod as any).Html5Qrcode;

      const id = "brapool-scanner-ausgeben";
      const scanner = new Html5Qrcode(id);
      qrRef.current = scanner;

      const config = {
        fps: 12,
        qrbox: { width: 260, height: 160 },
        rememberLastUsedCamera: true,
      } as any;

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
            // ignore
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
              <div id="brapool-scanner-ausgeben" className="w-full" />
            </div>
            <div className="mt-3 text-xs opacity-70">Tipp: Barcode ruhig in die Mitte. Scanner bleibt aktiv bis du schließt.</div>
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
              <div className="mt-2 rounded-xl border border-white/10 bg-white/5 p-3 font-mono text-xs">{last || "—"}</div>

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

              <div className="mt-4 text-xs opacity-70">{ready ? "Automatisch: Scan → Hinweis → neue Zeile." : ""}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
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

        const map = new Map<string, Waesche>();
        for (const it of json.items as Waesche[]) {
          map.set(it.barcode, it);
        }

        const filtered = new Map<string, Waesche>();
        for (const bc of barcodes) {
          const item = map.get(bc);
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
  <div className="flex flex-col gap-6 lg:grid lg:grid-cols-12">

    {/* Header / Logo */}
    <div className="w-full lg:col-span-12 flex items-center justify-center py-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-white/10" />
        <div className="text-xl font-semibold">BRApool</div>
      </div>
    </div>
      <div className="w-full lg:col-span-9">
        <div className="max-w-3xl">
          <div className="text-2xl font-semibold">Ausgeben</div>
          <div className="mt-2 text-sm opacity-70">Barcodes einfügen/scannen und ausgeben. Status wird auf UMLAUF gesetzt.</div>

          <div className="mt-6 grid grid-cols-12 gap-4">
            <div className="col-span-12 md:col-span-6 rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="text-sm font-medium mb-2">Ausgabe durch</div>
              <input
                className="w-full rounded-2xl border border-white/10 bg-white/5 p-3 text-sm"
                value={ausgetragenVon}
                onChange={(e) => setAusgetragenVon(e.target.value)}
                placeholder="z.B. Freddy"
              />
            </div>
            <div className="col-span-12 md:col-span-6 rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="text-sm font-medium mb-2">Ausgabe an</div>
              <input
                className="w-full rounded-2xl border border-white/10 bg-white/5 p-3 text-sm"
                value={ausgegebenAn}
                onChange={(e) => setAusgegebenAn(e.target.value)}
                placeholder="z.B. Wache 2 / Max Mustermann"
              />
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="text-sm font-medium mb-2">Barcodes</div>
            <textarea
              className="w-full min-h-[200px] sm:min-h-[240px] rounded-2xl border border-white/10 bg-white/5 p-4 font-mono text-sm"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={"BRA-0001\nBRA-0002\nBRA-0003"}
            />

            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs opacity-70">
                {barcodes.length} eindeutige Barcodes erkannt{resolveLoading ? " • prüfe…" : ""}
              </div>
              <button
                className="w-full sm:w-auto rounded-xl border border-white/10 bg-white/10 px-5 py-2 hover:bg-white/15 disabled:opacity-50"
                onClick={ausgeben}
                disabled={!canSubmit}
              >
                {loading ? "Ausgeben..." : "Ausgeben"}
              </button>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div className="text-lg font-semibold">Zusammenfassung</div>
              <div className="text-sm opacity-70">{summary.reduce((a, s) => a + s.n, 0)} erkannt</div>
            </div>

            <div className="p-5 space-y-2">
              {summary.length ? (
                summary.map((s) => (
                  <div key={s.label} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                    <div className="text-sm font-medium">{s.n}x</div>
                    <div className="min-w-0 flex-1 text-sm opacity-90 truncate">{s.label}</div>
                  </div>
                ))
              ) : (
                <div className="text-sm opacity-70">Noch keine passenden Einträge erkannt.</div>
              )}

              {missing.length > 0 && (
                <div className="mt-3 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm">
                  <div className="font-medium">Nicht gefunden</div>
                  <div className="mt-1 text-xs opacity-80">
                    {missing.slice(0, 10).join(", ")}
                    {missing.length > 10 ? ` … (+${missing.length - 10})` : ""}
                  </div>
                  <div className="mt-2 text-xs opacity-70">Diese Barcodes musst du erst in der Datenbank anlegen.</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <aside className="col-span-12 lg:col-span-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-lg font-semibold">Aktionen</div>
          <div className="mt-2 text-sm opacity-70">Scanner & Tools.</div>

          <div className="mt-5 space-y-3">
            <button
              className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-left hover:bg-white/15"
              onClick={() => setScannerOpen(true)}
            >
              <div className="text-sm font-medium">Kamera-Scanner</div>
              <div className="text-xs opacity-70">Automatisch scannen → neue Zeile</div>
            </button>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs opacity-70">
              <div className="font-medium text-sm opacity-90 mb-1">Pflichtfelder</div>
              „Ausgabe durch“ und „Ausgabe an“ müssen gesetzt sein.
            </div>
          </div>
        </div>
      </aside>

      <ScannerModal
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanned={(code) => setInput((cur) => mergeBarcodeIntoTextarea(cur, code))}
        onRemove={(code) => setInput((cur) => removeBarcodeFromTextarea(cur, code))}
      />
    </div>
  );
}