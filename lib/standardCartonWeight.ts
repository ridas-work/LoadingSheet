import standardRows from "@/data/standard-carton-weights.json";

import { findPackingByName, type PackingCatalogRow } from "@/lib/bundleCatalog";

export const CARTON_WEIGHT_TOLERANCE_PCT = 0.08;

type StandardRow = {
  packingCode: string;
  bottlesPerCarton: number;
  standardWeightKg: number;
};

const STANDARD_BY_KEY = new Map<string, number>(
  (standardRows as StandardRow[]).map((r) => [
    `${r.packingCode.trim().toLowerCase()}:${r.bottlesPerCarton}`,
    r.standardWeightKg,
  ]),
);

export function lookupStandardCartonWeight(
  productName: string,
  bottlesPerBox: number,
  catalog: PackingCatalogRow[],
): number | null {
  const packing = findPackingByName(productName, catalog);
  if (!packing) return null;
  const code = packing.code.trim().toLowerCase();
  return STANDARD_BY_KEY.get(`${code}:${bottlesPerBox}`) ?? null;
}

export function validateCartonWeight(
  actualKg: number,
  standardKg: number,
  tolerancePct: number = CARTON_WEIGHT_TOLERANCE_PCT,
):
  | { ok: true }
  | { ok: false; error: string; minKg: number; maxKg: number; standardKg: number } {
  const minKg = standardKg * (1 - tolerancePct);
  const maxKg = standardKg * (1 + tolerancePct);
  if (actualKg >= minKg && actualKg <= maxKg) return { ok: true };
  const pct = Math.round(tolerancePct * 100);
  return {
    ok: false,
    error: `Weight ${actualKg} kg is outside standard ${standardKg} kg (±${pct}%). Check the box — bottles missing or extra?`,
    minKg,
    maxKg,
    standardKg,
  };
}

export type SheetLineForWeight = {
  boxNo: number;
  productName: string;
  bottlesPerBox: number;
  cartonWeightKg?: number | null;
};

export function validateSheetLineCartonWeight(
  line: SheetLineForWeight,
  catalog: PackingCatalogRow[],
  actualKg: number | null | undefined,
): { ok: true; hasStandard: boolean } | { ok: false; error: string; boxNo: number } {
  const standard = lookupStandardCartonWeight(line.productName, line.bottlesPerBox, catalog);
  if (standard == null) return { ok: true, hasStandard: false };
  if (actualKg == null || !Number.isFinite(actualKg) || actualKg <= 0) {
    return {
      ok: false,
      error: `Enter carton weight (kg) for box ${line.boxNo}. Standard is ${standard} kg.`,
      boxNo: line.boxNo,
    };
  }
  const result = validateCartonWeight(actualKg, standard);
  if (!result.ok) {
    return { ok: false, error: result.error, boxNo: line.boxNo };
  }
  return { ok: true, hasStandard: true };
}

export function validateAllSheetCartonWeights(
  lines: SheetLineForWeight[],
  weightsByBox: Map<number, number>,
  catalog: PackingCatalogRow[],
): { ok: true } | { ok: false; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  for (const line of lines) {
    const result = validateSheetLineCartonWeight(line, catalog, weightsByBox.get(line.boxNo));
    if (!result.ok) {
      errors[`box.${line.boxNo}`] = result.error;
    }
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true };
}

export function allStandardCartonWeightsValid(
  lines: SheetLineForWeight[],
  catalog: PackingCatalogRow[],
): boolean {
  for (const line of lines) {
    const standard = lookupStandardCartonWeight(line.productName, line.bottlesPerBox, catalog);
    if (standard == null) continue;
    const kg = line.cartonWeightKg;
    if (kg == null || !Number.isFinite(kg) || kg <= 0) return false;
    if (!validateCartonWeight(kg, standard).ok) return false;
  }
  return true;
}

export function formatKg(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "";
  return String(Math.round(value * 1000) / 1000);
}
