type WaescheKategorie = "HOSE" | "POLO" | "SWEATJACKE" | "SOFTSHELLJACKE" | "HARDSHELLJACKE";

type CsvRow = Record<string, string>;

export type ParsedCsvItem = {
  barcode: string;
  kategorie: WaescheKategorie;
  groesse: string;
  cws: boolean;
};

export type ParsedCsvResult = {
  items: ParsedCsvItem[];
  errors: string[];
};

function normalizeHeader(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]/g, "");
}

function getByAliases(row: CsvRow, aliases: string[]) {
  const index = new Map<string, string>();
  for (const [k, v] of Object.entries(row)) {
    index.set(normalizeHeader(k), typeof v === "string" ? v.trim() : "");
  }

  for (const alias of aliases) {
    const hit = index.get(normalizeHeader(alias));
    if (hit !== undefined) return hit;
  }
  return "";
}

function parseKategorie(value: string): WaescheKategorie | null {
  const raw = value.trim().toUpperCase().replace(/\s+/g, "");
  if (!raw) return null;

  const mapped: Record<string, WaescheKategorie> = {
    HOSE: "HOSE",
    POLO: "POLO",
    SWEATJACKE: "SWEATJACKE",
    SOFTSHELLJACKE: "SOFTSHELLJACKE",
    HARDSHELLJACKE: "HARDSHELLJACKE",
  };

  const labelMapped: Record<string, WaescheKategorie> = {
    HOSE: "HOSE",
    POLOSHIRT: "POLO",
    POLO: "POLO",
    SWEATJACKE: "SWEATJACKE",
    SOFTSHELL: "SOFTSHELLJACKE",
    SOFTSHELLJACKE: "SOFTSHELLJACKE",
    HARDSHELL: "HARDSHELLJACKE",
    HARDSHELLJACKE: "HARDSHELLJACKE",
  };

  return mapped[raw] ?? labelMapped[raw] ?? null;
}

function parseCws(value: string): boolean {
  const raw = value.trim().toLowerCase();
  if (!raw) return false;
  return (
    raw === "1" ||
    raw === "true" ||
    raw === "ja" ||
    raw === "yes" ||
    raw === "y" ||
    raw === "x" ||
    raw === "bekannt"
  );
}

export function parseWaescheCsvRows(rows: CsvRow[]): ParsedCsvResult {
  const items: ParsedCsvItem[] = [];
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const rowNo = i + 1;
    const row = rows[i];

    const barcode = getByAliases(row, ["barcode", "bar_code", "code", "strichcode", "ean"]);
    const groesse = getByAliases(row, ["groesse", "größe", "size", "gr??e", "gr��e", "gre", "grsse"]);
    const rawKategorie = getByAliases(row, ["kategorie", "category", "typ"]);
    const rawCws = getByAliases(row, ["cws", "bei cws bekannt", "cws bekannt"]);
    const kategorie = parseKategorie(rawKategorie);
    const cws = parseCws(rawCws);

    if (!barcode || !groesse || !kategorie) {
      errors.push(
        `Zeile ${rowNo}: braucht barcode, kategorie, groesse (kategorie z.B. HOSE/POLO/SWEATJACKE).`
      );
      continue;
    }

    items.push({ barcode, groesse, kategorie, cws });
  }

  return { items, errors };
}
