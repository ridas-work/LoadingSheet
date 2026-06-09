import { connectToDatabase } from "@/lib/db";
import { ProductPacking } from "@/lib/models/ProductPacking";

export function trimQcField(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export function serializeProductionBatch(b: {
  _id: { toString(): string };
  batchNo: string;
  productName: string;
  totalLiters: number;
  preparedAt: Date;
  ph?: string | null;
  solids?: string | null;
  appearance?: string | null;
  provider?: string | null;
  hcl?: string | null;
  viscosity?: string | null;
  quantity?: string | null;
  notes?: string | null;
  createdByName?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
  usedLiters?: number;
  remainingLiters?: number;
  status?: string;
  locked?: boolean;
}) {
  return {
    id: b._id.toString(),
    batchNo: b.batchNo,
    productName: b.productName,
    totalLiters: b.totalLiters,
    preparedAt: b.preparedAt,
    ph: b.ph ?? "",
    solids: b.solids ?? "",
    appearance: b.appearance ?? "",
    provider: b.provider ?? "",
    hcl: b.hcl ?? "",
    viscosity: b.viscosity ?? "",
    quantity: b.quantity ?? "",
    notes: b.notes ?? "",
    createdByName: b.createdByName ?? "",
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
    ...(b.usedLiters !== undefined
      ? {
          usedLiters: b.usedLiters,
          remainingLiters: b.remainingLiters,
          status: b.status,
          locked: b.locked,
        }
      : {}),
  };
}

export async function resolveBatchFamily(productInput: string): Promise<string | null> {
  const trimmed = productInput.trim();
  if (!trimmed) return null;

  await connectToDatabase();
  const hit = await ProductPacking.findOne({
    active: true,
    $or: [{ batchFamily: trimmed }, { name: trimmed }, { aliases: trimmed }],
  }).lean();

  if (!hit) return null;
  const family = hit.batchFamily?.trim();
  return family || hit.name;
}

export function parseQcBody(body: Record<string, unknown>, requireAll: boolean) {
  const fields = {
    ph: trimQcField(body.ph),
    solids: trimQcField(body.solids),
    appearance: trimQcField(body.appearance),
    provider: trimQcField(body.provider),
    hcl: trimQcField(body.hcl),
    viscosity: trimQcField(body.viscosity),
    quantity: trimQcField(body.quantity),
  };

  if (!requireAll) return { ok: true as const, fields };

  const missing: string[] = [];
  if (!fields.ph) missing.push("pH");
  if (!fields.solids) missing.push("solids");
  if (!fields.appearance) missing.push("appearance");
  if (!fields.provider) missing.push("provider");
  if (!fields.hcl) missing.push("HCL");
  if (!fields.quantity) missing.push("quantity");

  if (missing.length > 0) {
    return { ok: false as const, error: `Required: ${missing.join(", ")}` };
  }

  return { ok: true as const, fields };
}
