"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Flashlight, ScanLine, Trash2, TriangleAlert } from "lucide-react";
import { createHtml5Qrcode, playScanBeep, type BarcodeScannerInstance } from "@/app/lib/barcode-scanner";
import { normalizeBarcodeForMatch } from "@/app/lib/barcode";
import EinlagernNeuModal, { type CreatedWaescheRow } from "@/app/components/EinlagernNeuModal";

type InventoryItem = { barcode: string; status: string };
type Summary = { total: number; umlauf: number; expected: number };
type Result = {
  scannedCount: number;
  unclearCount: number;
  umlaufScanned: number;
  protectedUmlaufCount: number;
};

function parseBarcodes(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[\s,;]+/)
        .map(normalizeBarcodeForMatch)
        .filter(Boolean)
    )
  );
}

export default function InventurPage() {
  const [input, setInput] = useState("");
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [summary, setSummary] = useState<Summary>({ total: 0, umlauf: 0, expected: 0 });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerStatus, setScannerStatus] = useState("");
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newlyCreated, setNewlyCreated] = useState<CreatedWaescheRow[]>([]);
  const scannerRef = useRef<BarcodeScannerInstance | null>(null);
  const lastScanRef = useRef({ code: "", at: 0 });

  const barcodes = useMemo(() => parseBarcodes(input), [input]);
  const knownByNormalized = useMemo(
    () => new Map(items.map((item) => [normalizeBarcodeForMatch(item.barcode), item])),
    [items]
  );
  const known = barcodes.filter((barcode) => knownByNormalized.has(barcode));
  const unknown = barcodes.filter((barcode) => !knownByNormalized.has(barcode));
  const scannedUmlauf = known.filter((barcode) => knownByNormalized.get(barcode)?.status === "UMLAUF").length;
  const progress = summary.expected
    ? Math.min(100, Math.round(((known.length - scannedUmlauf) / summary.expected) * 100))
    : 0;

  const addBarcode = useCallback((raw: string) => {
    const barcode = normalizeBarcodeForMatch(raw);
    if (!barcode) return;
    setInput((current) => {
      const currentCodes = parseBarcodes(current);
      if (currentCodes.includes(barcode)) return current;
      return currentCodes.length ? `${currentCodes.join("\n")}\n${barcode}\n` : `${barcode}\n`;
    });
  }, []);

  async function loadInventory() {
    setLoading(true);
    try {
      const res = await fetch("/api/waesche/inventur", { cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error ?? "Inventurdaten konnten nicht geladen werden.");
      setItems(Array.isArray(json.items) ? json.items : []);
      setSummary({ total: json.total ?? 0, umlauf: json.umlauf ?? 0, expected: json.expected ?? 0 });
    } catch (error) {
      alert(error instanceof Error ? error.message : "Inventurdaten konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadInventory();
  }, []);

  useEffect(() => {
    if (!scannerOpen) return;
    let stopped = false;

    async function startScanner() {
      setScannerStatus("Kamera wird gestartet …");
      setTorchSupported(false);
      setTorchOn(false);
      const scanner = await createHtml5Qrcode("inventur-scanner");
      if (stopped) {
        scanner.clear();
        return;
      }
      scannerRef.current = scanner;
      try {
        await scanner.start(
          { facingMode: "environment" },
          { fps: 12, qrbox: { width: 260, height: 160 }, rememberLastUsedCamera: true },
          (decodedText: string) => {
            const code = normalizeBarcodeForMatch(decodedText);
            const now = Date.now();
            if (!code || (lastScanRef.current.code === code && now - lastScanRef.current.at < 1200)) return;
            lastScanRef.current = { code, at: now };
            addBarcode(code);
            setScannerStatus(knownByNormalized.has(code) ? `Erfasst: ${code}` : `Unbekannter Barcode: ${code}`);
            void playScanBeep();
            if (navigator.vibrate) navigator.vibrate(20);
          },
          () => undefined
        );
        const capabilities = await scanner.getRunningTrackCapabilities?.();
        setTorchSupported(Boolean(capabilities?.torch));
        setScannerStatus("Bereit – Barcode vor die Kamera halten.");
      } catch (error) {
        setScannerStatus(error instanceof Error ? error.message : "Kamera konnte nicht gestartet werden.");
      }
    }

    void startScanner();
    return () => {
      stopped = true;
      const scanner = scannerRef.current;
      scannerRef.current = null;
      if (scanner) {
        scanner.stop().catch(() => null).finally(() => {
          try { scanner.clear(); } catch { /* Kamera ist bereits geschlossen. */ }
        });
      }
    };
  }, [scannerOpen, addBarcode, knownByNormalized]);

  async function toggleTorch() {
    if (!scannerRef.current || !torchSupported) return;
    const next = !torchOn;
    try {
      await scannerRef.current.applyVideoConstraints?.({
        advanced: [{ torch: next }],
      } as unknown as MediaTrackConstraints);
      setTorchOn(next);
    } catch {
      setScannerStatus("Der Blitz wird von diesem Gerät nicht unterstützt.");
    }
  }

  async function finishInventory() {
    if (!known.length || unknown.length || submitting) return;
    const unclearCount = Math.max(0, summary.expected - (known.length - scannedUmlauf));
    const confirmed = window.confirm(
      `Inventur wirklich abschließen?\n\n${known.length} Teile werden auf „Eingelagert“ gesetzt.\n` +
      `${unclearCount} nicht gescannte, nicht im Umlauf befindliche Teile werden auf „Unklar“ gesetzt.\n\n` +
      "Dieser Schritt aktualisiert den gesamten Bestand."
    );
    if (!confirmed) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/waesche/inventur", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barcodes }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        if (Array.isArray(json?.missing)) alert(`Unbekannte Barcodes:\n${json.missing.join("\n")}`);
        else alert(json?.error ?? "Inventur konnte nicht abgeschlossen werden.");
        return;
      }
      setResult(json);
      setInput("");
      setScannerOpen(false);
      await loadInventory();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreated(createdRows: CreatedWaescheRow[] = []) {
    setNewlyCreated((current) => {
      const byBarcode = new Map(current.map((row) => [normalizeBarcodeForMatch(row.barcode), row]));
      for (const row of createdRows) byBarcode.set(normalizeBarcodeForMatch(row.barcode), row);
      return Array.from(byBarcode.values());
    });
    await loadInventory();
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Inventur</h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Scanne alle physisch vorhandenen Teile. Beim Abschluss werden diese eingelagert; fehlende Teile werden auf unklar gesetzt. Nicht gescannte Umlaufstücke bleiben im Umlauf.
        </p>
      </header>

      {result && (
        <section className="rounded-2xl border border-emerald-300 bg-emerald-50 p-5 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100">
          <div className="flex items-center gap-2 font-semibold"><CheckCircle2 className="h-5 w-5" /> Inventur abgeschlossen</div>
          <div className="mt-2 text-sm">
            {result.scannedCount} eingelagert, {result.unclearCount} auf unklar gesetzt, {result.protectedUmlaufCount} nicht gescannte Umlaufstücke unverändert.
          </div>
        </section>
      )}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["Gesamt", summary.total],
          ["Im Umlauf", summary.umlauf],
          ["Zu prüfen", summary.expected],
          ["Gescannt", known.length],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
            <div className="text-3xl font-semibold">{loading ? "…" : value}</div>
            <div className="mt-1 text-xs text-zinc-500">{label}</div>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
        <div className="flex items-center justify-between text-sm">
          <span>Inventurfortschritt (ohne Umlauf)</span><span>{progress}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
          <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${progress}%` }} />
        </div>
      </section>

      <div className="grid grid-cols-12 gap-6">
        <section className="col-span-12 lg:col-span-7">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-semibold">Barcodes erfassen</div>
                <div className="text-xs text-zinc-500">Kamera oder Scanner-Tastatur verwenden</div>
              </div>
              <button onClick={() => setScannerOpen((open) => !open)} className="flex items-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-4 py-2 text-sm hover:bg-slate-100 dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15">
                <ScanLine className="h-4 w-4" /> {scannerOpen ? "Kamera schließen" : "Kamera öffnen"}
              </button>
            </div>

            {scannerOpen && (
              <div className="mt-4">
                <div className="overflow-hidden rounded-2xl bg-black"><div id="inventur-scanner" className="w-full" /></div>
                <div className="mt-2 flex items-center justify-between gap-3 text-xs text-zinc-500">
                  <span>{scannerStatus}</span>
                  <button disabled={!torchSupported} onClick={toggleTorch} className="flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1 disabled:opacity-40 dark:border-white/10">
                    <Flashlight className="h-3.5 w-3.5" /> {torchOn ? "Aus" : "Blitz"}
                  </button>
                </div>
              </div>
            )}

            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              className="mt-4 min-h-64 w-full rounded-2xl border border-slate-300 bg-slate-50 p-4 font-mono text-sm outline-none focus:border-slate-500 dark:border-white/10 dark:bg-black/20"
              placeholder={"Barcode scannen oder eingeben …\nEin Barcode pro Zeile"}
            />
            <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
              <span>{barcodes.length} eindeutig erfasst</span>
              <button onClick={() => setInput("")} disabled={!barcodes.length} className="flex items-center gap-1 rounded-lg px-2 py-1 hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-white/5">
                <Trash2 className="h-3.5 w-3.5" /> Liste leeren
              </button>
            </div>
          </div>
        </section>

        <aside className="col-span-12 space-y-4 lg:col-span-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
            <div className="font-semibold">Prüfung</div>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between"><span>Bekannt</span><span className="font-semibold text-emerald-600">{known.length}</span></div>
              <div className="flex justify-between"><span>Davon zuvor im Umlauf</span><span className="font-semibold">{scannedUmlauf}</span></div>
              <div className="flex justify-between"><span>Unbekannt</span><span className={unknown.length ? "font-semibold text-red-600" : "font-semibold"}>{unknown.length}</span></div>
            </div>
            {unknown.length > 0 && (
              <div className="mt-4 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
                <div className="flex items-center gap-2 font-medium"><TriangleAlert className="h-4 w-4" /> Unbekannte Barcodes klären</div>
                <div className="mt-2 break-all font-mono text-xs">{unknown.join(", ")}</div>
                <button
                  onClick={() => setCreateOpen(true)}
                  className="mt-3 w-full rounded-xl border border-red-300 bg-white px-3 py-2 font-sans text-sm font-medium hover:bg-red-100 dark:border-red-500/30 dark:bg-white/10 dark:hover:bg-white/15"
                >
                  Als neue Kleidungsstücke erfassen
                </button>
              </div>
            )}
            {newlyCreated.length > 0 && (
              <div className="mt-4 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
                <div className="font-medium">Während dieser Inventur neu erfasst: {newlyCreated.length}</div>
                <div className="mt-2 break-all font-mono text-xs">
                  {newlyCreated.map((row) => row.barcode).join(", ")}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 dark:border-amber-500/30 dark:bg-amber-500/10">
            <div className="font-semibold">Auswirkung beim Abschluss</div>
            <p className="mt-2 text-sm opacity-80">
              Voraussichtlich {Math.max(0, summary.expected - (known.length - scannedUmlauf))} nicht gescannte Teile werden auf „Unklar“ gesetzt.
            </p>
            <button
              onClick={finishInventory}
              disabled={loading || submitting || !known.length || unknown.length > 0}
              className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-3 font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-slate-900"
            >
              {submitting ? "Inventur wird abgeschlossen …" : "Inventur abschließen"}
            </button>
          </div>
        </aside>
      </div>

      {createOpen && (
        <EinlagernNeuModal
          open={createOpen}
          barcodes={unknown}
          onClose={() => setCreateOpen(false)}
          onCreated={(createdRows) => void handleCreated(createdRows)}
        />
      )}
    </div>
  );
}
