export function normalizeBarcodeForMatch(value: string): string {
  const s = value.trim();
  if (!s) return "";
  if (/^\d+$/.test(s)) {
    const stripped = s.replace(/^0+/, "");
    return stripped || "0";
  }
  return s.toUpperCase();
}

type StoredRow = { barcode: string };

export function matchIncomingBarcodes<T extends StoredRow>(
  incoming: string[],
  stored: T[]
): { matched: T[]; missing: string[] } {
  const byExact = new Map<string, T>();
  const byNormalized = new Map<string, T>();

  for (const row of stored) {
    const exact = row.barcode.trim();
    if (exact && !byExact.has(exact)) byExact.set(exact, row);

    const normalized = normalizeBarcodeForMatch(row.barcode);
    if (normalized && !byNormalized.has(normalized)) byNormalized.set(normalized, row);
  }

  const matchedMap = new Map<string, T>();
  const missing: string[] = [];

  for (const raw of incoming) {
    const exact = raw.trim();
    if (!exact) continue;

    const exactHit = byExact.get(exact);
    if (exactHit) {
      matchedMap.set(exactHit.barcode, exactHit);
      continue;
    }

    const normalized = normalizeBarcodeForMatch(exact);
    const normalizedHit = normalized ? byNormalized.get(normalized) : undefined;
    if (normalizedHit) {
      matchedMap.set(normalizedHit.barcode, normalizedHit);
      continue;
    }

    missing.push(exact);
  }

  return { matched: Array.from(matchedMap.values()), missing };
}
