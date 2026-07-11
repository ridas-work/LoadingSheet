import type { ChemicalIntakeDoc } from "@/lib/models/ChemicalIntake";
import type { ChemicalMaterialRequestDoc } from "@/lib/models/ChemicalMaterialRequest";
import type { ChemicalRawMaterialDoc } from "@/lib/models/ChemicalRawMaterial";
import {
  canReviewChemicalRequests as roleCanReview,
  canEditChemicalAccessoryStock as roleCanEditAccessoryStock,
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

export function canEditChemicalAccessoryStock(role: AppRole | null): boolean {
  return roleCanEditAccessoryStock(role);
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
  kind: ChemicalMaterialKind;
  unit: string;
  onHand: number;
  sortOrder: number;
};

export type ChemicalMaterialKind = "chemical" | "accessory";

export type ChemicalRequestAccessory = {
  itemCode: string;
  itemName: string;
  quantityRequested: number;
  unit: string;
  onHandAtRequest: number;
};

export type SerializedChemicalRequest = {
  id: string;
  materialCode: string;
  materialName: string;
  quantityRequested: number;
  unit: string;
  onHandAtRequest: number;
  accessories: ChemicalRequestAccessory[];
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

export type ChemicalAccessoryCategory = "drums" | "shoppers" | "seals";

export type ChemicalAccessoryDefinition = {
  code: string;
  name: string;
  unit: "pcs";
  category: ChemicalAccessoryCategory;
};

export const CHEMICAL_ACCESSORY_CATEGORIES: { id: ChemicalAccessoryCategory; label: string }[] = [
  { id: "drums", label: "Drums" },
  { id: "shoppers", label: "Shoppers" },
  { id: "seals", label: "Seals" },
];

export const CHEMICAL_ACCESSORIES: readonly ChemicalAccessoryDefinition[] = [
  { code: "drum-25l", name: "25 litre drum", unit: "pcs", category: "drums" },
  { code: "drum-100l", name: "100 litre drum", unit: "pcs", category: "drums" },
  { code: "drum-115l", name: "115 litre drum", unit: "pcs", category: "drums" },
  { code: "drum-150l", name: "150 litre drum", unit: "pcs", category: "drums" },
  { code: "drum-200l", name: "200 litre drum", unit: "pcs", category: "drums" },
  { code: "drum-215l", name: "215 litre drum", unit: "pcs", category: "drums" },
  { code: "shopper-40x60", name: "40 × 60", unit: "pcs", category: "shoppers" },
  { code: "shopper-25x40", name: "25 × 40", unit: "pcs", category: "shoppers" },
  { code: "seal-plastic", name: "Plastic seals", unit: "pcs", category: "seals" },
  { code: "seal-steel", name: "Steel seals", unit: "pcs", category: "seals" },
  { code: "seal-lock", name: "Lock seals", unit: "pcs", category: "seals" },
  { code: "seal-tile", name: "Tile seals", unit: "pcs", category: "seals" },
];

/** Retired generic rows — kept for migration only. */
export const LEGACY_CHEMICAL_ACCESSORY_CODES = ["shoppers", "drums", "seals"] as const;

export const CHEMICAL_ACCESSORY_CODES = CHEMICAL_ACCESSORIES.map((item) => item.code);

export function chemicalAccessoriesByCategory(category: ChemicalAccessoryCategory) {
  return CHEMICAL_ACCESSORIES.filter((item) => item.category === category);
}

export function normalizeChemicalMaterialKind(value: unknown): ChemicalMaterialKind {
  return value === "accessory" ? "accessory" : "chemical";
}

export function findChemicalAccessory(code: string) {
  const normalized = code.trim().toLowerCase();
  return CHEMICAL_ACCESSORIES.find((item) => item.code === normalized) ?? null;
}

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
    kind: normalizeChemicalMaterialKind(d.kind),
    unit: String(d.unit ?? "kg"),
    onHand: typeof d.onHand === "number" && Number.isFinite(d.onHand) ? d.onHand : 0,
    sortOrder: typeof d.sortOrder === "number" ? d.sortOrder : 0,
  };
}

function serializeChemicalRequestAccessory(input: unknown): ChemicalRequestAccessory | null {
  const item = input as Partial<ChemicalRequestAccessory> | null;
  if (!item) return null;
  const itemCode = String(item.itemCode ?? "").trim().toLowerCase();
  if (!itemCode) return null;
  return {
    itemCode,
    itemName: String(item.itemName ?? ""),
    quantityRequested: Number(item.quantityRequested) || 0,
    unit: String(item.unit ?? "pcs"),
    onHandAtRequest: Number(item.onHandAtRequest) || 0,
  };
}

export function serializeChemicalRequest(
  doc: ChemicalMaterialRequestDoc | Record<string, unknown>,
): SerializedChemicalRequest {
  const d = doc as ChemicalMaterialRequestDoc;
  const accessories = Array.isArray(d.accessories)
    ? d.accessories.map((item) => serializeChemicalRequestAccessory(item)).filter((item) => !!item)
    : [];
  return {
    id: String((d as { _id?: { toString(): string } })._id?.toString() ?? ""),
    materialCode: String(d.materialCode ?? ""),
    materialName: String(d.materialName ?? ""),
    quantityRequested: Number(d.quantityRequested) || 0,
    unit: String(d.unit ?? "kg"),
    onHandAtRequest: Number(d.onHandAtRequest) || 0,
    accessories,
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
