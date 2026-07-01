import { productBaseName } from "@/lib/customBottleSizes";
import {
  normalizeCustomCartonProductName,
  upsertCustomCartonProduct,
} from "@/lib/customCartonProductStore";
import { connectToDatabase } from "@/lib/db";
import type { ParsedOrderPayload } from "@/lib/orderPayload";
import { ProductPacking } from "@/lib/models/ProductPacking";

export type PersistActor = { userId?: string; name?: string };

async function mainCatalogNameKeys(): Promise<Set<string>> {
  await connectToDatabase();
  const rows = await ProductPacking.find({ active: true })
    .select({ name: 1, aliases: 1, batchFamily: 1 })
    .lean();
  const keys = new Set<string>();
  for (const p of rows) {
    keys.add(p.name.trim().toLowerCase());
    if (p.batchFamily?.trim()) keys.add(p.batchFamily.trim().toLowerCase());
    for (const alias of p.aliases ?? []) {
      if (alias.trim()) keys.add(alias.trim().toLowerCase());
    }
  }
  return keys;
}

function normalizeForStore(raw: string): string {
  return normalizeCustomCartonProductName(productBaseName(raw.trim()));
}

/** Save user-entered names to the shared custom-product list (orders, samples, Nimra custom box). */
export async function persistCustomProductNames(
  rawNames: string[],
  actor?: PersistActor,
): Promise<void> {
  const mainKeys = await mainCatalogNameKeys();
  const seen = new Set<string>();

  for (const raw of rawNames) {
    const name = normalizeForStore(raw);
    const key = name.toLowerCase();
    if (!name || seen.has(key) || mainKeys.has(key)) continue;
    seen.add(key);
    await upsertCustomCartonProduct(name, actor);
  }
}

export function collectProductNamesFromOrderPayload(payload: ParsedOrderPayload): string[] {
  const names: string[] = [];

  for (const carton of payload.customCartons) {
    for (const row of carton.contents) {
      if (row.productName.trim()) names.push(row.productName);
    }
  }

  if (payload.mixedSample) {
    for (const row of payload.mixedSample.contents) {
      if (row.productName.trim()) names.push(row.productName);
    }
  }

  for (const item of payload.items) {
    if (item.productName?.trim()) names.push(item.productName);
  }

  return names;
}

export function collectProductNamesFromSampleList(
  sampleProducts: Array<{ productName?: string }>,
): string[] {
  return sampleProducts
    .map((p) => (typeof p.productName === "string" ? p.productName.trim() : ""))
    .filter(Boolean);
}
