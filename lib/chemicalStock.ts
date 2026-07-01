import { connectToDatabase } from "@/lib/db";
import type { ChemicalMaterialRequestDoc } from "@/lib/models/ChemicalMaterialRequest";
import { ChemicalRawMaterial, type ChemicalRawMaterialDoc } from "@/lib/models/ChemicalRawMaterial";
import { ChemicalStockMovement } from "@/lib/models/ChemicalStockMovement";

export type StockActor = {
  userId?: string;
  name: string;
};

export type StockShortageError = {
  ok: false;
  error: string;
  onHand: number;
  requested: number;
  unit: string;
};

export function slugifyChemicalCode(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "chemical";
}

async function uniqueCode(base: string): Promise<string> {
  let code = base;
  let n = 2;
  while (await ChemicalRawMaterial.exists({ code })) {
    code = `${base}-${n}`;
    n += 1;
  }
  return code;
}

/** Find by code or name; create catalog row if missing. */
export async function resolveOrCreateMaterial(input: {
  materialCode?: string;
  materialName: string;
  unit?: string;
}): Promise<{ material: ChemicalRawMaterialDoc; created: boolean }> {
  await connectToDatabase();
  const name = input.materialName.trim();
  if (!name) {
    throw new Error("Material name is required.");
  }

  const codeHint = input.materialCode?.trim().toLowerCase();
  if (codeHint) {
    const byCode = await ChemicalRawMaterial.findOne({ code: codeHint, active: true });
    if (byCode) return { material: byCode, created: false };
  }

  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const byName = await ChemicalRawMaterial.findOne({
    active: true,
    name: { $regex: new RegExp(`^${escaped}$`, "i") },
  });
  if (byName) return { material: byName, created: false };

  const base = slugifyChemicalCode(name);
  const code = await uniqueCode(base);
  const doc = await ChemicalRawMaterial.create({
    code,
    name,
    unit: input.unit?.trim() || "kg",
    onHand: 0,
    sortOrder: 9999,
    active: true,
  });
  return { material: doc, created: true };
}

export function validateStockForApprove(
  material: { onHand?: number | null; unit?: string | null },
  quantityRequested: number,
): { ok: true } | StockShortageError {
  const onHand =
    typeof material.onHand === "number" && Number.isFinite(material.onHand) ? material.onHand : 0;
  const unit = material.unit ?? "kg";
  if (onHand < quantityRequested) {
    return {
      ok: false,
      error: `Cannot approve — insufficient stock. On hand: ${onHand} ${unit}, requested: ${quantityRequested} ${unit}. Record a new intake (Esha) or adjust stock first.`,
      onHand,
      requested: quantityRequested,
      unit,
    };
  }
  return { ok: true };
}

async function logMovement(input: {
  materialCode: string;
  movementType: "intake" | "request_approved" | "admin_adjust";
  quantityDelta: number;
  onHandAfter: number;
  referenceId?: string;
  note?: string;
  actor: StockActor;
}) {
  await ChemicalStockMovement.create({
    materialCode: input.materialCode,
    movementType: input.movementType,
    quantityDelta: input.quantityDelta,
    onHandAfter: input.onHandAfter,
    referenceId: input.referenceId ?? "",
    note: input.note ?? "",
    recordedByUserId: input.actor.userId ?? "",
    recordedByName: input.actor.name,
  });
}

export async function addIntakeToStock(input: {
  materialCode: string;
  quantity: number;
  intakeId: string;
  actor: StockActor;
  note?: string;
}): Promise<ChemicalRawMaterialDoc> {
  await connectToDatabase();
  const updated = await ChemicalRawMaterial.findOneAndUpdate(
    { code: input.materialCode, active: true },
    { $inc: { onHand: input.quantity } },
    { new: true },
  );
  if (!updated) {
    throw new Error("Material not found for intake.");
  }
  await logMovement({
    materialCode: input.materialCode,
    movementType: "intake",
    quantityDelta: input.quantity,
    onHandAfter: updated.onHand ?? 0,
    referenceId: input.intakeId,
    note: input.note,
    actor: input.actor,
  });
  return updated;
}

export async function deductForApprovedRequest(input: {
  request: ChemicalMaterialRequestDoc;
  actor: StockActor;
}): Promise<{ material: ChemicalRawMaterialDoc; request: ChemicalMaterialRequestDoc }> {
  await connectToDatabase();
  const qty = Number(input.request.quantityRequested);
  const code = String(input.request.materialCode).toLowerCase();

  const material = await ChemicalRawMaterial.findOneAndUpdate(
    { code, active: true, onHand: { $gte: qty } },
    { $inc: { onHand: -qty } },
    { new: true },
  );
  if (!material) {
    const current = await ChemicalRawMaterial.findOne({ code, active: true }).lean();
    const check = validateStockForApprove(current ?? { onHand: 0 }, qty);
    if (!check.ok) {
      throw new Error(check.error);
    }
    throw new Error("Could not deduct stock for approved request.");
  }

  await logMovement({
    materialCode: code,
    movementType: "request_approved",
    quantityDelta: -qty,
    onHandAfter: material.onHand ?? 0,
    referenceId: String(input.request._id),
    actor: input.actor,
  });

  return { material, request: input.request };
}

export async function adminAdjustStock(input: {
  materialCode: string;
  newOnHand: number;
  actor: StockActor;
  note?: string;
}): Promise<ChemicalRawMaterialDoc> {
  await connectToDatabase();
  const existing = await ChemicalRawMaterial.findOne({
    code: input.materialCode,
    active: true,
  }).lean();
  if (!existing) {
    throw new Error("Material not found.");
  }
  const prev = typeof existing.onHand === "number" ? existing.onHand : 0;
  const delta = input.newOnHand - prev;

  const updated = await ChemicalRawMaterial.findOneAndUpdate(
    { code: input.materialCode, active: true },
    { $set: { onHand: input.newOnHand } },
    { new: true },
  );
  if (!updated) {
    throw new Error("Material not found.");
  }

  if (delta !== 0) {
    await logMovement({
      materialCode: input.materialCode,
      movementType: "admin_adjust",
      quantityDelta: delta,
      onHandAfter: updated.onHand ?? 0,
      note: input.note ?? "Admin stock adjust",
      actor: input.actor,
    });
  }

  return updated;
}
