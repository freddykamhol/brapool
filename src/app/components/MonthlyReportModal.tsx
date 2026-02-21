"use client";

import { useMemo, useState } from "react";
import ModalShell from "@/app/components/ModalShell";

type Waesche = {
  kategorie: string;
  groesse: string;
  eingelagertAm: string | null;
  ausgetragenVon: string | null;
  ausgegebenAn: string | null;
  ausgabeDatum: string | null;
};

type ReportActionRow = {
  kategorie: string;
  groesse: string;
  aktion: "Eingelagert" | "Ausgegeben";
  ausgetragenVon: string;
  ausgegebenAn: string;
  zeitstempel: Date;
};

type MonthlyReportModalProps = {
  open: boolean;
  onClose: () => void;
  items: Waesche[];
};

function toMonthValue(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function toLabel(d: Date) {
  return d.toLocaleDateString("de-DE", { month: "long", year: "numeric" });
}

function fmtDateTime(date: Date) {
  return date.toLocaleString("de-DE");
}

function inSelectedMonth(iso: string, selectedMonth: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  return toMonthValue(d) === selectedMonth;
}

export default function MonthlyReportModal({ open, onClose, items }: MonthlyReportModalProps) {
  const [selectedMonth, setSelectedMonth] = useState<string>(toMonthValue(new Date()));

  const reportRows = useMemo<ReportActionRow[]>(() => {
    const rows: ReportActionRow[] = [];
    for (const item of items) {
      if (item.eingelagertAm && inSelectedMonth(item.eingelagertAm, selectedMonth)) {
        rows.push({
          kategorie: item.kategorie,
          groesse: item.groesse,
          aktion: "Eingelagert",
          ausgetragenVon: "—",
          ausgegebenAn: "—",
          zeitstempel: new Date(item.eingelagertAm),
        });
      }

      if (item.ausgabeDatum && inSelectedMonth(item.ausgabeDatum, selectedMonth)) {
        rows.push({
          kategorie: item.kategorie,
          groesse: item.groesse,
          aktion: "Ausgegeben",
          ausgetragenVon: item.ausgetragenVon?.trim() || "—",
          ausgegebenAn: item.ausgegebenAn?.trim() || "—",
          zeitstempel: new Date(item.ausgabeDatum),
        });
      }
    }

    return rows.sort((a, b) => a.zeitstempel.getTime() - b.zeitstempel.getTime());
  }, [items, selectedMonth]);

  async function generatePdf() {
    const [year, month] = selectedMonth.split("-").map((x) => Number(x));
    if (!year || !month) {
      alert("Ungültiger Monat.");
      return;
    }

    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);

    const monthLabel = toLabel(new Date(year, month - 1, 1));
    const createdAt = new Date();
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const total = reportRows.length;
    const eingelagert = reportRows.filter((r) => r.aktion === "Eingelagert").length;
    const ausgegeben = reportRows.filter((r) => r.aktion === "Ausgegeben").length;

    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 34, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("BRApool Monatsbericht", 14, 16);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Wäschestatus und Bewegungen", 14, 22);
    doc.text(`Berichtsmonat: ${monthLabel}`, 14, 28);
    doc.text(`Erstellt: ${fmtDateTime(createdAt)}`, 130, 28);

    doc.setTextColor(15, 23, 42);
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(14, 40, 58, 18, 2, 2, "F");
    doc.roundedRect(76, 40, 58, 18, 2, 2, "F");
    doc.roundedRect(138, 40, 58, 18, 2, 2, "F");

    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text("Datensaetze", 18, 47);
    doc.text("Eingelagert", 80, 47);
    doc.text("Ausgegeben", 142, 47);

    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.text(String(total), 18, 55);
    doc.text(String(eingelagert), 80, 55);
    doc.text(String(ausgegeben), 142, 55);

    autoTable(doc, {
      startY: 64,
      head: [["Kategorie", "Größe", "Aktion", "Ausgegeben von", "Ausgegeben an", "Zeitstempel"]],
      body: reportRows.map((row) => [
        row.kategorie,
        row.groesse,
        row.aktion,
        row.ausgetragenVon,
        row.ausgegebenAn,
        fmtDateTime(row.zeitstempel),
      ]),
      styles: {
        font: "helvetica",
        fontSize: 9,
        cellPadding: 2.5,
        textColor: [30, 41, 59],
      },
      headStyles: {
        fillColor: [226, 232, 240],
        textColor: [15, 23, 42],
        fontStyle: "bold",
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      theme: "grid",
      margin: { left: 14, right: 14 },
      didDrawPage: () => {
        const pageHeight = doc.internal.pageSize.getHeight();
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text("BRApool", 14, pageHeight - 6);
        doc.text(`Seite ${doc.getCurrentPageInfo().pageNumber}`, 184, pageHeight - 6);
      },
    });

    if (!reportRows.length) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text("Keine Einträge für den ausgewählten Monat.", 14, 72);
    }

    const filename = `BRApool_Monatsbericht_${selectedMonth}.pdf`;
    doc.save(filename);
  }

  const monthLabel = useMemo(() => {
    const [year, month] = selectedMonth.split("-").map((x) => Number(x));
    if (!year || !month) return selectedMonth;
    return toLabel(new Date(year, month - 1, 1));
  }, [selectedMonth]);

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      panelClassName="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-white/10 dark:bg-slate-900/80 dark:backdrop-blur"
    >
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold">Monatsbericht</div>
            <div className="text-sm text-zinc-500 dark:text-zinc-400">
              PDF mit Bewegungen für {monthLabel}
            </div>
          </div>
          <button
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100 dark:border-white/10 dark:hover:bg-white/5"
            onClick={onClose}
          >
            Schließen
          </button>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 dark:border-white/10 dark:bg-white/5">
          <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Monat
          </label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full max-w-xs rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-white/10"
          />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 dark:border-white/10 dark:bg-white/5">
          <div className="mb-2 text-sm font-medium">Vorschau</div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400">
            {reportRows.length} Datensätze ({reportRows.filter((r) => r.aktion === "Eingelagert").length} Eingelagert,{" "}
            {reportRows.filter((r) => r.aktion === "Ausgegeben").length} Ausgegeben)
          </div>
          <div className="mt-3 max-h-56 overflow-auto rounded-xl border border-slate-200 dark:border-white/10">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-slate-100 text-zinc-600 dark:bg-white/10 dark:text-zinc-300">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Kategorie</th>
                  <th className="px-3 py-2 text-left font-medium">Größe</th>
                  <th className="px-3 py-2 text-left font-medium">Aktion</th>
                  <th className="px-3 py-2 text-left font-medium">Ausgegeben von</th>
                  <th className="px-3 py-2 text-left font-medium">Ausgegeben an</th>
                  <th className="px-3 py-2 text-left font-medium">Zeitstempel</th>
                </tr>
              </thead>
              <tbody>
                {reportRows.slice(0, 100).map((row, index) => (
                  <tr key={`${row.kategorie}-${row.groesse}-${row.aktion}-${row.zeitstempel.toISOString()}-${index}`} className="border-t border-slate-100 dark:border-white/5">
                    <td className="px-3 py-2">{row.kategorie}</td>
                    <td className="px-3 py-2">{row.groesse}</td>
                    <td className="px-3 py-2">{row.aktion}</td>
                    <td className="px-3 py-2">{row.ausgetragenVon}</td>
                    <td className="px-3 py-2">{row.ausgegebenAn}</td>
                    <td className="px-3 py-2">{fmtDateTime(row.zeitstempel)}</td>
                  </tr>
                ))}
                {!reportRows.length && (
                  <tr>
                    <td className="px-3 py-4 text-zinc-500 dark:text-zinc-400" colSpan={6}>
                      Keine Einträge im ausgewählten Monat.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100 dark:border-white/10 dark:hover:bg-white/5"
            onClick={onClose}
          >
            Abbrechen
          </button>
          <button
            className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-2 text-sm hover:bg-slate-100 dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15"
            onClick={() => void generatePdf()}
          >
            PDF generieren
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
