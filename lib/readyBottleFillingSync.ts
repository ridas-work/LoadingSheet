import { applyReadyBottleDelta, previewDeltas } from "@/lib/readyBottleLedger";

type AppliedLine = { productCode: string; readyBottlesApplied: number };
type PackingLine = { productCode: string; productName: string; readyToDeliverBottles: number };

export function computeReadyLedgerDeltas(args: {
  previousApplied: AppliedLine[];
  previousPackingLines: PackingLine[];
  newPackingLines: PackingLine[];
  batchNo: string;
  entryDate: string;
}): Array<{ productCode: string; productName: string; delta: number }> {
  const prevByCode = new Map<string, number>();
  for (const a of args.previousApplied) {
    prevByCode.set(a.productCode.trim().toLowerCase(), a.readyBottlesApplied);
  }
  if (prevByCode.size === 0) {
    for (const l of args.previousPackingLines) {
      const code = l.productCode.trim().toLowerCase();
      prevByCode.set(code, l.readyToDeliverBottles ?? 0);
    }
  }

  const nextByCode = new Map<string, { productName: string; bottles: number }>();
  for (const l of args.newPackingLines) {
    const code = l.productCode.trim().toLowerCase();
    if (!code) continue;
    nextByCode.set(code, {
      productName: l.productName,
      bottles: l.readyToDeliverBottles ?? 0,
    });
  }

  const codes = new Set([...prevByCode.keys(), ...nextByCode.keys()]);
  const deltas: Array<{ productCode: string; productName: string; delta: number }> = [];

  for (const code of codes) {
    const prev = prevByCode.get(code) ?? 0;
    const next = nextByCode.get(code)?.bottles ?? 0;
    const delta = next - prev;
    if (delta === 0) continue;
    deltas.push({
      productCode: code,
      productName: nextByCode.get(code)?.productName ?? code,
      delta,
    });
  }

  return deltas;
}

export async function syncReadyBottleLedgerFromFilling(args: {
  previousApplied: AppliedLine[];
  previousPackingLines: PackingLine[];
  newPackingLines: PackingLine[];
  batchNo: string;
  entryDate: string;
  audit: { userId: string; userName: string };
}): Promise<{ error: string | null; applied: AppliedLine[] }> {
  const deltas = computeReadyLedgerDeltas(args);
  if (deltas.length === 0) {
    return {
      error: null,
      applied: args.newPackingLines.map((l) => ({
        productCode: l.productCode.trim().toLowerCase(),
        readyBottlesApplied: l.readyToDeliverBottles,
      })),
    };
  }

  const previewError = await previewDeltas(deltas);
  if (previewError) return { error: previewError, applied: args.previousApplied };

  for (const d of deltas) {
    const err = await applyReadyBottleDelta({
      productCode: d.productCode,
      productName: d.productName,
      delta: d.delta,
      reason: "filling_ready",
      note: `Batch ${args.batchNo} ready bottles ${args.entryDate}`,
      batchNo: args.batchNo,
      entryDate: args.entryDate,
      audit: args.audit,
    });
    if (err) return { error: err, applied: args.previousApplied };
  }

  return {
    error: null,
    applied: args.newPackingLines.map((l) => ({
      productCode: l.productCode.trim().toLowerCase(),
      readyBottlesApplied: l.readyToDeliverBottles,
    })),
  };
}
