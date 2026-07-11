import catalog from "@/data/market-visit-sku-catalog.json";

export type MarketVisitSkuKey = (typeof catalog)[number]["key"];

export type MarketVisitSku = {
  key: MarketVisitSkuKey;
  group: string;
  columnLabel: string;
  packingCode?: string;
};

export const MARKET_VISIT_SKUS: MarketVisitSku[] = catalog as MarketVisitSku[];

export type MarketVisitSkuGroup = {
  group: string;
  skus: MarketVisitSku[];
};

export function getMarketVisitSkuGroups(): MarketVisitSkuGroup[] {
  const groups: MarketVisitSkuGroup[] = [];
  for (const sku of MARKET_VISIT_SKUS) {
    const last = groups[groups.length - 1];
    if (last?.group === sku.group) {
      last.skus.push(sku);
    } else {
      groups.push({ group: sku.group, skus: [sku] });
    }
  }
  return groups;
}

export const MARKET_VISIT_SKU_KEYS = MARKET_VISIT_SKUS.map((s) => s.key);
