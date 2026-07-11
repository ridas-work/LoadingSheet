import { MARKET_VISIT_SKU_KEYS } from "@/lib/marketVisitCatalog";
import { MarketVisitStoreAlert } from "@/lib/models/MarketVisitStoreAlert";
import { normalizeMarketStoreKey } from "@/lib/marketVisitStoreKey";
import type { MarketVisitRow } from "@/lib/marketVisitTypes";

export { normalizeMarketStoreKey } from "@/lib/marketVisitStoreKey";

export async function fetchOpenAlertsByStoreKeys(
  storeKeys: string[],
): Promise<Record<string, string[]>> {
  const unique = [...new Set(storeKeys.filter(Boolean))];
  if (unique.length === 0) return {};

  const docs = await MarketVisitStoreAlert.find({
    storeKey: { $in: unique },
    resolvedAt: null,
  })
    .select({ storeKey: 1, skuKey: 1 })
    .lean();

  const out: Record<string, string[]> = {};
  for (const doc of docs) {
    const list = out[doc.storeKey] ?? [];
    list.push(doc.skuKey);
    out[doc.storeKey] = list;
  }
  return out;
}

export async function syncMarketVisitAlerts(args: {
  visitId: string;
  username: string;
  rows: MarketVisitRow[];
}): Promise<Record<string, string[]>> {
  const now = new Date();
  const username = args.username.trim().toLowerCase();

  for (const row of args.rows) {
    const storeName = row.storeName.trim();
    if (!storeName) continue;

    const storeKey = normalizeMarketStoreKey(storeName, row.location);
    const location = row.location.trim();

    for (const skuKey of MARKET_VISIT_SKU_KEYS) {
      const value = row.availability[skuKey] ?? "";
      if (value === "no") {
        await MarketVisitStoreAlert.findOneAndUpdate(
          { storeKey, skuKey, resolvedAt: null },
          {
            $set: {
              storeName,
              location,
              openedAt: now,
              openedByVisitId: args.visitId,
              openedByUsername: username,
            },
            $setOnInsert: { storeKey, skuKey },
          },
          { upsert: true },
        );
      } else if (value === "yes") {
        await MarketVisitStoreAlert.updateMany(
          { storeKey, skuKey, resolvedAt: null },
          { $set: { resolvedAt: now, resolvedByVisitId: args.visitId } },
        );
      }
    }
  }

  const storeKeys = [
    ...new Set(
      args.rows
        .filter((row) => row.storeName.trim())
        .map((row) => normalizeMarketStoreKey(row.storeName, row.location)),
    ),
  ];

  return fetchOpenAlertsByStoreKeys(storeKeys);
}
