"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ModalShell from "@/app/components/ModalShell";

type CsvRow = Record<string, string>;

type Props = {
  open: boolean;
  onClose: () => void;
  /** Optional: callback when user clicks "Importieren" (API kommt später). */
  onConfirmImport?: (rows: CsvRow[]) => void | Promise<void>;
};

function guessDelimiter(text: string): "," | ";" | "\t" {
  const sample = text.split(/\r?\n/).slice(0, 5).join("\n");
  const commas = (sample.match(/,/g) ?? []).length;
  const semis = (sample.match(/;/g) ?? []).length;
  const tabs = (sample.match(/\t/g) ?? []).length;
  if (semis >= commas && semis >= tabs) return ";";
  if (tabs >= commas && tabs >= semis) return "\t";
  return ",";
}

function splitCsvLine(line: string, delimiter: string): string[] {
  // Minimal CSV parsing (supports quotes)
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '"') {
      // handle escaped quotes ""
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }

    if (!inQuotes && ch === delimiter) {
      out.push(cur.trim());
      cur = "";
      continue;
    }

    cur += ch;
  }

  out.push(cur.trim());
  return out;
}

function isProbablyHeader(values: string[]) {
  // Heuristic: header typically contains letters and fewer purely numeric tokens
  const nonEmpty = values.filter((v) => v.trim().length > 0);
  if (!nonEmpty.length) return false;
  const withLetters = nonEmpty.filter((v) => /[a-zA-ZäöüÄÖÜ]/.test(v)).length;
  return withLetters >= Math.max(1, Math.floor(nonEmpty.length / 3));
}

function parseCsv(text: string, delimiter: string): { headers: string[]; rows: CsvRow[]; rawRows: string[][] } {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l) => l.trim().length > 0);

  if (!lines.length) return { headers: [], rows: [], rawRows: [] };

  const matrix = lines.map((l) => splitCsvLine(l, delimiter));

  let headers: string[];
  let startIndex = 0;

  if (isProbablyHeader(matrix[0])) {
    headers = matrix[0].map((h, idx) => (h.trim() ? h.trim() : `Spalte ${idx + 1}`));
    startIndex = 1;
  } else {
    const maxCols = Math.max(...matrix.map((r) => r.length));
    headers = Array.from({ length: maxCols }, (_, i) => `Spalte ${i + 1}`);
  }

  const rawRows = matrix.slice(startIndex);

  const rows: CsvRow[] = rawRows.map((r) => {
    const obj: CsvRow = {};
    for (let i = 0; i < headers.length; i++) obj[headers[i]] = (r[i] ?? "").trim();
    return obj;
  });

  return { headers, rows, rawRows };
}

export default function CsvImportModal({ open, onClose, onConfirmImport }: Props) {
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string>("");
  const [rawText, setRawText] = useState<string>("");
  const [delimiter, setDelimiter] = useState<"," | ";" | "\t">(",");
  const [error, setError] = useState<string>("");
  const [importing, setImporting] = useState(false);

  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setDragOver(false);
    setFileName("");
    setRawText("");
    setDelimiter(",");
    setError("");
    setImporting(false);
  }, [open]);

  const parsed = useMemo(() => {
    if (!rawText.trim()) return { headers: [], rows: [] as CsvRow[] };
    try {
      const p = parseCsv(rawText, delimiter);
      return { headers: p.headers, rows: p.rows };
    } catch {
      return { headers: [], rows: [] as CsvRow[] };
    }
  }, [rawText, delimiter]);

  const previewRows = useMemo(() => parsed.rows.slice(0, 30), [parsed.rows]);

  async function readFile(file: File) {
    setError("");
    setFileName(file.name);

    if (!file.name.toLowerCase().endsWith(".csv") && file.type !== "text/csv") {
      // allow anyway, but warn
    }

    const text = await file.text();
    const guessed = guessDelimiter(text);
    setDelimiter(guessed);
    setRawText(text);
  }

  async function onFiles(files: FileList | null) {
    if (!files || !files.length) return;
    const file = files[0];
    try {
      await readFile(file);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Datei konnte nicht gelesen werden.");
    }
  }

  async function confirmImport() {
    if (!parsed.rows.length) return;
    setImporting(true);
    try {
      await onConfirmImport?.(parsed.rows);
      // API kommt später — ohne Callback machen wir nur Close
      if (!onConfirmImport) {
        alert(`CSV geladen: ${parsed.rows.length} Zeilen (Import-API folgt).`);
      }
      onClose();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Import fehlgeschlagen.");
    } finally {
      setImporting(false);
    }
  }

  if (!open) return null;

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      panelClassName="max-w-5xl rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-white/10 dark:bg-slate-900/70 dark:backdrop-blur p-6"
    >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-lg font-semibold">CSV Import</div>
            <div className="text-sm text-zinc-500 dark:text-zinc-400">Datei reinziehen oder auswählen — rechts siehst du sofort eine Vorschau.</div>
          </div>
          <button className="rounded-xl border border-slate-300 px-3 py-1.5 hover:bg-slate-100 dark:border-white/10 dark:hover:bg-white/5" onClick={onClose}>
            Schließen
          </button>
        </div>

        <div className="mt-5 grid grid-cols-12 gap-4">
          {/* Left: Dropzone */}
          <div className="col-span-12 lg:col-span-5">
            <div
              className={
                "rounded-2xl border p-5 transition-colors " +
                (dragOver
                  ? "border-slate-300 bg-slate-100 dark:border-white/20 dark:bg-white/10"
                  : "border-slate-200 bg-slate-50 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10")
              }
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={async (e) => {
                e.preventDefault();
                setDragOver(false);
                const file = e.dataTransfer.files?.[0];
                if (file) await readFile(file);
              }}
            >
              <div className="text-sm font-medium">Datei auswählen</div>
              <div className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Zieh eine .csv hier rein — oder nutz den Button.</div>

              <div className="mt-4 flex gap-2">
                <button
                  className="rounded-xl border border-slate-300 bg-slate-100 px-4 py-2 text-sm hover:bg-slate-200 dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15"
                  onClick={() => inputRef.current?.click()}
                >
                  Datei auswählen
                </button>

                <button
                  className={
                    "rounded-xl border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100 dark:border-white/10 dark:hover:bg-white/5 " +
                    (!rawText ? "opacity-50 cursor-not-allowed" : "")
                  }
                  disabled={!rawText}
                  onClick={() => {
                    setFileName("");
                    setRawText("");
                    setError("");
                  }}
                >
                  Zurücksetzen
                </button>

                <input
                  ref={inputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => onFiles(e.target.files)}
                />
              </div>

              <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">Erkannt</div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">{fileName || "—"}</div>
                </div>

                <div className="mt-3 grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-12 md:col-span-6">
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Trennzeichen</div>
                    <select
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5"
                      value={delimiter}
                      onChange={(e) => setDelimiter(e.target.value as "," | ";" | "\t")}
                      disabled={!rawText}
                    >
                      <option value=",">Komma (,)</option>
                      <option value=";">Semikolon (;)</option>
                      <option value="\t">Tab</option>
                    </select>
                  </div>

                  <div className="col-span-12 md:col-span-6">
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Zeilen</div>
                    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5">
                      {parsed.rows.length ? parsed.rows.length : "—"}
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm">
                    {error}
                  </div>
                )}

                {!error && rawText && parsed.headers.length === 0 && (
                  <div className="mt-3 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm">
                    CSV konnte nicht geparst werden.
                  </div>
                )}
              </div>

              <div className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
                Tipp: Für BRApool ist es praktisch, wenn deine CSV Spalten wie <span className="font-mono">barcode,kategorie,groesse,status</span> hat.
              </div>
            </div>
          </div>

          {/* Right: Preview */}
          <div className="col-span-12 lg:col-span-7">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 px-5 py-4">
                <div className="text-lg font-semibold">Vorschau</div>
                <div className="text-sm text-zinc-500 dark:text-zinc-400">
                  {parsed.rows.length ? `${Math.min(parsed.rows.length, 30)} / ${parsed.rows.length}` : "—"}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-slate-200 dark:border-white/10 opacity-80">
                    <tr>
                      {(parsed.headers.length ? parsed.headers : ["—"]).slice(0, 8).map((h) => (
                        <th key={h} className="px-5 py-3 text-left font-medium whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.length ? (
                      previewRows.map((r, idx) => (
                        <tr key={idx} className="border-b border-white/5">
                          {parsed.headers.slice(0, 8).map((h) => (
                            <td key={h} className="px-5 py-3 whitespace-nowrap">
                              {r[h] || ""}
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="px-5 py-6 text-zinc-500 dark:text-zinc-400" colSpan={8}>
                          Keine Daten — wähle links eine CSV-Datei aus.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between border-t border-slate-200 dark:border-white/10 px-5 py-4">
                <div className="text-xs text-zinc-500 dark:text-zinc-400">Import-API bauen wir als nächstes — UI ist fertig.</div>
                <button
                  className={
                    "rounded-xl border border-slate-300 bg-slate-100 px-4 py-2 text-sm hover:bg-slate-200 dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15 disabled:opacity-50"
                  }
                  disabled={!parsed.rows.length || importing}
                  onClick={confirmImport}
                >
                  {importing ? "Importiere..." : "Importieren"}
                </button>
              </div>
            </div>
          </div>
        </div>
    </ModalShell>
  );
}
