import mongoose from "mongoose";

import { connectToDatabase } from "@/lib/db";
import type { ChemicalMaterialKind } from "@/lib/chemicalMaterials";
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
  shortages: StockShortageLine[];
};

export type StockShortageLine = {
  itemCode: string;
  itemName: string;
  requested: number;
  onHand: number;
  unit: string;
};

type RequestedStockLine = {
  itemCode: string;
  itemName: string;
  quantityRequested: number;
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
  kind?: ChemicalMaterialKind;
  unit?: string;
}): Promise<{ material: ChemicalRawMaterialDoc; created: boolean }> {
  await connectToDatabase();
  const name = input.materialName.trim();
  if (!name) {
    throw new Error("Material name is required.");
  }

  const kind = input.kind ?? "chemical";
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
    kind,
    unit: input.unit?.trim() || "kg",
    onHand: 0,
    sortOrder: 9999,
    active: true,
  });
  return { material: doc, created: true };
}

function requestStockLines(request: ChemicalMaterialRequestDoc): RequestedStockLine[] {
  const lines: RequestedStockLine[] = [
    {
      itemCode: String(request.materialCode).toLowerCase(),
      itemName: String(request.materialName),
      quantityRequested: Number(request.quantityRequested),
      unit: String(request.unit ?? "kg"),
    },
  ];

  const accessories = Array.isArray(request.accessories) ? request.accessories : [];
  for (const item of accessories) {
    const itemCode = String(item.itemCode ?? "").trim().toLowerCase();
    const quantityRequested = Number(item.quantityRequested);
    if (!itemCode || !Number.isFinite(quantityRequested) || quantityRequested <= 0) continue;
    lines.push({
      itemCode,
      itemName: String(item.itemName ?? itemCode),
      quantityRequested,
      unit: String(item.unit ?? "pcs"),
    });
  }

  return lines;
}

function aggregateStockLines(lines: RequestedStockLine[]): RequestedStockLine[] {
  const byCode = new Map<string, RequestedStockLine>();
  for (const line of lines) {
    const itemCode = line.itemCode.trim().toLowerCase();
    const quantityRequested = Number(line.quantityRequested);
    if (!itemCode || !Number.isFinite(quantityRequested) || quantityRequested <= 0) continue;
    const existing = byCode.get(itemCode);
    if (existing) {
      existing.quantityRequested += quantityRequested;
    } else {
      byCode.set(itemCode, { ...line, itemCode, quantityRequested });
    }
  }
  return Array.from(byCode.values());
}

export function formatStockShortageError(shortages: StockShortageLine[]): string {
  if (shortages.length === 0) {
    return "Cannot approve - insufficient stock.";
  }
  return shortages
    .map(
      (item) =>
        `Cannot approve - ${item.itemName} stock is less. On hand: ${item.onHand} ${item.unit}, requested: ${item.requested} ${item.unit}.`,
    )
    .join(" ");
}

export function validateStockForApprove(
  material: { code?: string | null; name?: string | null; onHand?: number | null; unit?: string | null },
  quantityRequested: number,
): { ok: true } | StockShortageError {
  const onHand =
    typeof material.onHand === "number" && Number.isFinite(material.onHand) ? material.onHand : 0;
  const unit = material.unit ?? "kg";
  if (onHand < quantityRequested) {
    const shortage = {
      itemCode: material.code ?? "",
      itemName: material.name ?? "Chemical",
      onHand,
      requested: quantityRequested,
      unit,
    };
    return {
      ok: false,
      error: formatStockShortageError([shortage]),
      onHand,
      requested: quantityRequested,
      unit,
      shortages: [shortage],
    };
  }
  return { ok: true };
}

export async function validateRequestStockForApprove(
  request: ChemicalMaterialRequestDoc,
): Promise<{ ok: true } | { ok: false; error: string; shortages: StockShortageLine[] }> {
  await connectToDatabase();
  const lines = aggregateStockLines(requestStockLines(request));
  const materials = await ChemicalRawMaterial.find({
    code: { $in: lines.map((line) => line.itemCode) },
    active: true,
  }).lean();
  const byCode = new Map(materials.map((material) => [String(material.code), material]));
  const shortages: StockShortageLine[] = [];

  for (const line of lines) {
    const material = byCode.get(line.itemCode);
    const onHand =
      typeof material?.onHand === "number" && Number.isFinite(material.onHand) ? material.onHand : 0;
    const unit = String(material?.unit ?? line.unit);
    if (onHand < line.quantityRequested) {
      shortages.push({
        itemCode: line.itemCode,
        itemName: line.itemName,
        requested: line.quantityRequested,
        onHand,
        unit,
      });
    }
  }

  if (shortages.length > 0) {
    return { ok: false, error: formatStockShortageError(shortages), shortages };
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
  session?: mongoose.ClientSession;
}) {
  const doc = {
    materialCode: input.materialCode,
    movementType: input.movementType,
    quantityDelta: input.quantityDelta,
    onHandAfter: input.onHandAfter,
    referenceId: input.referenceId ?? "",
    note: input.note ?? "",
    recordedByUserId: input.actor.userId ?? "",
    recordedByName: input.actor.name,
  };
  if (input.session) {
    await ChemicalStockMovement.create([doc], { session: input.session });
  } else {
    await ChemicalStockMovement.create(doc);
  }
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

async function currentShortageForLine(
  line: RequestedStockLine,
  session?: mongoose.ClientSession,
): Promise<StockShortageLine> {
  const query = ChemicalRawMaterial.findOne({ code: line.itemCode, active: true }).lean();
  if (session) query.session(session);
  const current = await query;
  const onHand =
    typeof current?.onHand === "number" && Number.isFinite(current.onHand) ? current.onHand : 0;
  return {
    itemCode: line.itemCode,
    itemName: line.itemName,
    requested: line.quantityRequested,
    onHand,
    unit: String(current?.unit ?? line.unit),
  };
}

async function deductStockLines(input: {
  lines: RequestedStockLine[];
  actor: StockActor;
  referenceId: string;
  session?: mongoose.ClientSession;
}): Promise<ChemicalRawMaterialDoc[]> {
  const deducted: { line: RequestedStockLine; material: ChemicalRawMaterialDoc }[] = [];
  for (const line of input.lines) {
    const material = await ChemicalRawMaterial.findOneAndUpdate(
      { code: line.itemCode, active: true, onHand: { $gte: line.quantityRequested } },
      { $inc: { onHand: -line.quantityRequested } },
      { new: true, session: input.session },
    );
    if (!material) {
      const shortage = await currentShortageForLine(line, input.session);
      throw new Error(formatStockShortageError([shortage]));
    }
    deducted.push({ line, material });
  }

  for (const item of deducted) {
    await logMovement({
      materialCode: item.line.itemCode,
      movementType: "request_approved",
      quantityDelta: -item.line.quantityRequested,
      onHandAfter: item.material.onHand ?? 0,
      referenceId: input.referenceId,
      actor: input.actor,
      session: input.session,
    });
  }

  return deducted.map((item) => item.material);
}

async function deductStockLinesWithRollback(input: {
  lines: RequestedStockLine[];
  actor: StockActor;
  referenceId: string;
}): Promise<ChemicalRawMaterialDoc[]> {
  const deducted: { line: RequestedStockLine; material: ChemicalRawMaterialDoc }[] = [];
  try {
    for (const line of input.lines) {
      const material = await ChemicalRawMaterial.findOneAndUpdate(
        { code: line.itemCode, active: true, onHand: { $gte: line.quantityRequested } },
        { $inc: { onHand: -line.quantityRequested } },
        { new: true },
      );
      if (!material) {
        const shortage = await currentShortageForLine(line);
        throw new Error(formatStockShortageError([shortage]));
      }
      deducted.push({ line, material });
    }

    for (const item of deducted) {
      await logMovement({
        materialCode: item.line.itemCode,
        movementType: "request_approved",
        quantityDelta: -item.line.quantityRequested,
        onHandAfter: item.material.onHand ?? 0,
        referenceId: input.referenceId,
        actor: input.actor,
      });
    }

    return deducted.map((item) => item.material);
  } catch (e) {
    for (const item of deducted.reverse()) {
      await ChemicalRawMaterial.findOneAndUpdate(
        { code: item.line.itemCode, active: true },
        { $inc: { onHand: item.line.quantityRequested } },
      );
    }
    throw e;
  }
}

function findPrimaryDeductedMaterial(
  request: ChemicalMaterialRequestDoc,
  materials: ChemicalRawMaterialDoc[],
): ChemicalRawMaterialDoc {
  const code = String(request.materialCode).toLowerCase();
  const material = materials.find((item) => item.code === code);
  if (!material) {
    throw new Error("Could not deduct stock for approved request.");
  }
  return material;
}

function isTransactionUnsupportedError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("Transaction numbers are only allowed") ||
    message.includes("transactions are not supported") ||
    message.includes("Transaction not supported") ||
    message.includes("This MongoDB deployment does not support retryable writes")
  );
}

export async function deductForApprovedRequest(input: {
  request: ChemicalMaterialRequestDoc;
  actor: StockActor;
}): Promise<{
  material: ChemicalRawMaterialDoc;
  materials: ChemicalRawMaterialDoc[];
  request: ChemicalMaterialRequestDoc;
}> {
  await connectToDatabase();
  const check = await validateRequestStockForApprove(input.request);
  if (!check.ok) {
    throw new Error(check.error);
  }

  const lines = aggregateStockLines(requestStockLines(input.request));
  const referenceId = String(input.request._id);

  const session = await mongoose.startSession();
  try {
    let updated: ChemicalRawMaterialDoc[] = [];
    await session.withTransaction(async () => {
      updated = await deductStockLines({ lines, actor: input.actor, referenceId, session });
    });
    return {
      material: findPrimaryDeductedMaterial(input.request, updated),
      materials: updated,
      request: input.request,
    };
  } catch (e) {
    if (!isTransactionUnsupportedError(e)) {
      throw e;
    }
  } finally {
    await session.endSession();
  }

  const updated = await deductStockLinesWithRollback({
    lines,
    actor: input.actor,
    referenceId,
  });
  return {
    material: findPrimaryDeductedMaterial(input.request, updated),
    materials: updated,
    request: input.request,
  };
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
