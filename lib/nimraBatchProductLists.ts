import customCartonProductNames from "@/data/custom-carton-products.json";
import { connectToDatabase } from "@/lib/db";
import { listCustomCartonProducts } from "@/lib/customCartonProductStore";
import { ProductPacking } from "@/lib/models/ProductPacking";

export type NimraBatchKind = "standard" | "custom_box";

export type UnifiedBatchProductGroup = "dispatch" | "custom";

export type UnifiedBatchProductOption = {
  name: string;
  group: UnifiedBatchProductGroup;
};

export function nimraProductKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Names used only on custom-box / drum batches (Hand Sanitizer, Sequester, etc.). */
export async function listCustomBoxBatchProductNames(): Promise<string[]> {
  await connectToDatabase();
  const fromDb = await listCustomCartonProducts();
  const names = new Map<string, string>();
  for (const raw of customCartonProductNames as string[]) {
    const name = raw.trim();
    if (!name) continue;
    names.set(nimraProductKey(name), name);
  }
  for (const p of fromDb) {
    const name = p.name.trim();
    if (!name) continue;
    names.set(nimraProductKey(name), name);
  }
  return [...names.values()].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}

export async function listStandardBatchFamilies(): Promise<string[]> {
  await connectToDatabase();
  const customKeys = new Set(
    (await listCustomBoxBatchProductNames()).map((n) => nimraProductKey(n)),
  );

  const list = await ProductPacking.find({ active: true })
    .select({ name: 1, batchFamily: 1, bundleComponents: 1 })
    .lean();

  const seen = new Set<string>();
  const families: string[] = [];
  for (const p of list) {
    if ((p.bundleComponents ?? []).length > 0) continue;
    const family = (p.batchFamily?.trim() || p.name).trim();
    if (!family) continue;
    const key = nimraProductKey(family);
    if (customKeys.has(key)) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    families.push(family);
  }
  return families.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}

/** All products Esha can pick — dispatch families plus custom/drum catalog. */
export async function listUnifiedBatchProductOptions(): Promise<UnifiedBatchProductOption[]> {
  const customNames = await listCustomBoxBatchProductNames();
  const customKeys = new Set(customNames.map((n) => nimraProductKey(n)));
  const dispatchFamilies = await listStandardBatchFamilies();

  const options: UnifiedBatchProductOption[] = [];
  for (const name of dispatchFamilies) {
    if (customKeys.has(nimraProductKey(name))) continue;
    options.push({ name, group: "dispatch" });
  }
  for (const name of customNames) {
    options.push({ name, group: "custom" });
  }
  return options;
}

export async function isCustomBoxBatchProduct(resolvedName: string): Promise<boolean> {
  const hit = await resolveCustomBoxBatchProduct(resolvedName);
  return hit !== null && nimraProductKey(hit) === nimraProductKey(resolvedName);
}

export async function inferBatchKindForProduct(resolvedName: string): Promise<NimraBatchKind> {
  return (await isCustomBoxBatchProduct(resolvedName)) ? "custom_box" : "standard";
}

export async function resolveUnifiedBatchProduct(productInput: string): Promise<string | null> {
  const custom = await resolveCustomBoxBatchProduct(productInput);
  if (custom) return custom;

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

export async function resolveCustomBoxBatchProduct(productInput: string): Promise<string | null> {
  const key = nimraProductKey(productInput);
  if (!key) return null;
  const list = await listCustomBoxBatchProductNames();
  const hit = list.find((n) => nimraProductKey(n) === key);
  return hit ?? null;
}

export function inferNimraBatchKind(batch: {
  batchKind?: string | null;
  drum?: string | null;
  productName?: string;
}): NimraBatchKind {
  if (batch.batchKind === "custom_box" || batch.batchKind === "standard") {
    return batch.batchKind;
  }
  if (batch.drum?.trim()) return "custom_box";
  return "standard";
}
