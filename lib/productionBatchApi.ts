import { connectToDatabase } from "@/lib/db";
import {
  inferBatchKindForProduct,
  resolveUnifiedBatchProduct,
  type NimraBatchKind,
} from "@/lib/nimraBatchProductLists";
import { ProductPacking } from "@/lib/models/ProductPacking";
import { isRhinoBatchFamily } from "@/lib/viscosityBatchFamily";

export function trimQcField(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export { parseTotalLitersFromQuantity } from "@/lib/parseBatchQuantityLiters";

export type ProductionPurpose = "regular" | "sample";

export function parseProductionPurpose(v: unknown): ProductionPurpose {
  return v === "sample" ? "sample" : "regular";
}

export function serializeProductionBatch(b: {
  _id: { toString(): string };
  batchNo: string;
  batchKind?: string | null;
  productionPurpose?: string | null;
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
  drum?: string | null;
  customer?: string | null;
  notes?: string | null;
  qcOutcome?: string | null;
  qcComment?: string | null;
  qcStatusAt?: Date | null;
  qcStatusByName?: string | null;
  createdByName?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
  closedAt?: Date | null;
  closedByName?: string | null;
  closureWasteLiters?: number | null;
  closureWasteNote?: string | null;
  closureUsedLitersSnapshot?: number | null;
  closureRemainingLitersSnapshot?: number | null;
  usedLiters?: number;
  remainingLiters?: number;
  remainingSampleLiters?: number;
  status?: string;
  locked?: boolean;
}) {
  return {
    id: b._id.toString(),
    batchNo: b.batchNo,
    batchKind: b.batchKind === "custom_box" ? "custom_box" : "standard",
    productionPurpose: b.productionPurpose === "sample" ? "sample" : "regular",
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
    drum: b.drum ?? "",
    customer: b.customer ?? "",
    notes: b.notes ?? "",
    qcOutcome: b.qcOutcome === "rejected" || b.qcOutcome === "discarded" ? b.qcOutcome : "approved",
    qcComment: b.qcComment ?? "",
    qcStatusAt: b.qcStatusAt,
    qcStatusByName: b.qcStatusByName ?? "",
    createdByName: b.createdByName ?? "",
    closedAt: b.closedAt ?? null,
    closedByName: b.closedByName ?? "",
    closureWasteLiters: b.closureWasteLiters ?? null,
    closureWasteNote: b.closureWasteNote ?? "",
    closureUsedLitersSnapshot: b.closureUsedLitersSnapshot ?? null,
    closureRemainingLitersSnapshot: b.closureRemainingLitersSnapshot ?? null,
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
    ...(b.remainingSampleLiters !== undefined ? { remainingSampleLiters: b.remainingSampleLiters } : {}),
  };
}

export function parseBatchKind(v: unknown): NimraBatchKind {
  return v === "custom_box" ? "custom_box" : "standard";
}

export async function resolveBatchProduct(
  productInput: string,
  batchKind?: NimraBatchKind,
): Promise<string | null> {
  return resolveUnifiedBatchProduct(productInput);
}

export async function resolveBatchProductWithKind(
  productInput: string,
  explicitKind?: NimraBatchKind,
): Promise<{ product: string; batchKind: NimraBatchKind } | null> {
  const product = await resolveUnifiedBatchProduct(productInput);
  if (!product) return null;
  const batchKind = explicitKind ?? (await inferBatchKindForProduct(product));
  return { product, batchKind };
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

export function parseQcBody(
  body: Record<string, unknown>,
  requireAll: boolean,
  options?: { productFamily?: string; batchKind?: NimraBatchKind },
) {
  const batchKind = options?.batchKind ?? "standard";
  const productFamily = options?.productFamily?.trim() ?? "";
  const isCustom = batchKind === "custom_box";
  const needsHcl = !isCustom && isRhinoBatchFamily(productFamily);

  const fields = {
    ph: trimQcField(body.ph),
    solids: trimQcField(body.solids),
    appearance: trimQcField(body.appearance),
    provider: trimQcField(body.provider),
    hcl: needsHcl ? trimQcField(body.hcl) : "",
    viscosity: !isCustom ? trimQcField(body.viscosity) : "",
    quantity: trimQcField(body.quantity),
    drum: isCustom ? trimQcField(body.drum) : "",
    customer: trimQcField(body.customer),
  };

  if (!requireAll) return { ok: true as const, fields };

  const missing: string[] = [];
  if (!fields.ph) missing.push("pH");
  if (!fields.solids) missing.push("solids");
  if (!fields.appearance) missing.push("appearance");
  if (!fields.provider) missing.push("provider");
  if (needsHcl && !fields.hcl) {
    missing.push("HCL");
  }
  if (!fields.quantity) missing.push("quantity");

  if (missing.length > 0) {
    return { ok: false as const, error: `Required: ${missing.join(", ")}` };
  }

  return { ok: true as const, fields };
}
