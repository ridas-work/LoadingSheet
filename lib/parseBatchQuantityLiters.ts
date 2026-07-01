/** Parse dispatch-pool liters from Nimra's quantity field (e.g. `350`, `450L`, `450 litres`). */
export function parseTotalLitersFromQuantity(quantity: string): number | null {
  const trimmed = quantity.trim();
  if (!trimmed) return null;

  const asNumber = Number(trimmed);
  if (Number.isFinite(asNumber) && asNumber > 0) return asNumber;

  const literMatch = trimmed.match(/^([\d.]+)\s*(?:l|litre|litres|liter|liters)\b/i);
  if (literMatch) {
    const v = Number(literMatch[1]);
    if (Number.isFinite(v) && v > 0) return v;
  }

  const leading = trimmed.match(/^([\d.]+)/);
  if (leading) {
    const v = Number(leading[1]);
    if (Number.isFinite(v) && v > 0) return v;
  }

  return null;
}
