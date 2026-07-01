import customCartonProductNames from "@/data/custom-carton-products.json";
import { connectToDatabase } from "@/lib/db";
import { listCustomCartonProducts } from "@/lib/customCartonProductStore";
import { ProductPacking } from "@/lib/models/ProductPacking";

export type NimraBatchKind = "standard" | "custom_box";

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
