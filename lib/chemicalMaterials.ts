import type { ChemicalIntakeDoc } from "@/lib/models/ChemicalIntake";
import type { ChemicalMaterialRequestDoc } from "@/lib/models/ChemicalMaterialRequest";
import type { ChemicalRawMaterialDoc } from "@/lib/models/ChemicalRawMaterial";
import {
  canReviewChemicalRequests as roleCanReview,
  canEditChemicalStock as roleCanEditStock,
  canViewChemicalMaterials as roleCanView,
  canRequestChemicalMaterials as roleCanRequest,
  type AppRole,
} from "@/lib/roles";

export function canViewChemicalMaterials(role: AppRole | null): boolean {
  return roleCanView(role);
}

export function canEditChemicalStock(role: AppRole | null): boolean {
  return roleCanEditStock(role);
}

export function canRequestChemicalMaterials(role: AppRole | null): boolean {
  return roleCanRequest(role);
}

export function canReviewChemicalRequests(role: AppRole | null): boolean {
  return roleCanReview(role);
}

export type SerializedChemicalMaterial = {
  code: string;
  name: string;
  unit: string;
  onHand: number;
  sortOrder: number;
};

export type SerializedChemicalRequest = {
  id: string;
  materialCode: string;
  materialName: string;
  quantityRequested: number;
  unit: string;
  onHandAtRequest: number;
  status: string;
  note: string;
  adminNote: string;
  requestedByName: string;
  requestedByUsername: string;
  reviewedByName: string;
  reviewedAt: string | null;
  orderedAt: string | null;
  createdAt: string | null;
};

export type SerializedChemicalIntake = {
  id: string;
  materialCode: string;
  materialName: string;
  quantity: number;
  unit: string;
  qcOutcome: string;
  qcComment: string;
  appearance: string;
  ph: string;
  solids: string;
  provider: string;
  lotNo: string;
  receivedAt: string | null;
  recordedByName: string;
  createdAt: string | null;
};

export function serializeChemicalMaterial(
  doc: ChemicalRawMaterialDoc | Record<string, unknown>,
): SerializedChemicalMaterial {
  const d = doc as ChemicalRawMaterialDoc;
  return {
    code: String(d.code ?? ""),
    name: String(d.name ?? ""),
    unit: String(d.unit ?? "kg"),
    onHand: typeof d.onHand === "number" && Number.isFinite(d.onHand) ? d.onHand : 0,
    sortOrder: typeof d.sortOrder === "number" ? d.sortOrder : 0,
  };
}

export function serializeChemicalRequest(
  doc: ChemicalMaterialRequestDoc | Record<string, unknown>,
): SerializedChemicalRequest {
  const d = doc as ChemicalMaterialRequestDoc;
  return {
    id: String((d as { _id?: { toString(): string } })._id?.toString() ?? ""),
    materialCode: String(d.materialCode ?? ""),
    materialName: String(d.materialName ?? ""),
    quantityRequested: Number(d.quantityRequested) || 0,
    unit: String(d.unit ?? "kg"),
    onHandAtRequest: Number(d.onHandAtRequest) || 0,
    status: String(d.status ?? "pending"),
    note: String(d.note ?? ""),
    adminNote: String(d.adminNote ?? ""),
    requestedByName: String(d.requestedByName ?? ""),
    requestedByUsername: String(d.requestedByUsername ?? ""),
    reviewedByName: String(d.reviewedByName ?? ""),
    reviewedAt: d.reviewedAt ? new Date(d.reviewedAt).toISOString() : null,
    orderedAt: d.orderedAt ? new Date(d.orderedAt).toISOString() : null,
    createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : null,
  };
}

export function serializeChemicalIntake(
  doc: ChemicalIntakeDoc | Record<string, unknown>,
): SerializedChemicalIntake {
  const d = doc as ChemicalIntakeDoc;
  return {
    id: String((d as { _id?: { toString(): string } })._id?.toString() ?? ""),
    materialCode: String(d.materialCode ?? ""),
    materialName: String(d.materialName ?? ""),
    quantity: Number(d.quantity) || 0,
    unit: String(d.unit ?? "kg"),
    qcOutcome: String(d.qcOutcome ?? "approved"),
    qcComment: String(d.qcComment ?? ""),
    appearance: String(d.appearance ?? ""),
    ph: String(d.ph ?? ""),
    solids: String(d.solids ?? ""),
    provider: String(d.provider ?? ""),
    lotNo: String(d.lotNo ?? ""),
    receivedAt: d.receivedAt ? new Date(d.receivedAt).toISOString() : null,
    recordedByName: String(d.recordedByName ?? ""),
    createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : null,
  };
}
