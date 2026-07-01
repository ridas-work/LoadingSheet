import { isFillingContainerSizeCode, packingCatalogFromDocs } from "@/lib/catalogFromDb";
import {
  type DeductionPackagingItem,
  type DeductionPacking,
} from "@/lib/packagingDeduction";
import { packagingBalance } from "@/lib/packagingInventory";

export type FillingPackingLineInput = {
  productCode: string;
  filledBottlesToday: number;
};

export type PackagingUipAppliedLine = {
  productCode: string;
  filledBottlesApplied: number;
};

export type FillingUipIncrement = {
  itemCode: string;
  itemName: string;
  quantity: number;
  detail: string;
};

function key(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function packingFamily(packing: DeductionPacking): string {
  return packing.batchFamily?.trim() || packing.name;
}

function matchesFamily(itemFamily: string | null | undefined, packingFamilyName: string): boolean {
  const item = key(itemFamily);
  const packing = key(packingFamilyName);
  return Boolean(item && packing && (packing === item || packing.startsWith(item) || item.startsWith(packing)));
}

function productItemMatches(item: DeductionPackagingItem, packing: DeductionPacking, deductAs: string): boolean {
  if (key(item.deductAs || item.category) !== deductAs) return false;
  if (key(item.linkedProductCode) === key(packing.code)) return true;
  return matchesFamily(item.linkedBatchFamily, packingFamily(packing));
}

function findProductItem(
  items: DeductionPackagingItem[],
  packing: DeductionPacking,
  deductAs: string,
): DeductionPackagingItem | null {
  return items.find((item) => item.active !== false && productItemMatches(item, packing, deductAs)) ?? null;
}

function containerKind(packing: DeductionPacking): "pouch" | "bottle" {
  return /pouch/i.test(packing.name) ? "pouch" : "bottle";
}

function filledByCode(lines: FillingPackingLineInput[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const line of lines) {
    const code = key(line.productCode);
    if (!code) continue;
    m.set(code, line.filledBottlesToday ?? 0);
  }
  return m;
}

/**
 * Delta of filled bottles per product → UIP increments on mapped bottle + cap SKUs.
 */
export function computeFillingUipIncrements(args: {
  previousLines: FillingPackingLineInput[];
  newLines: FillingPackingLineInput[];
  catalog: DeductionPacking[];
  packagingItems: DeductionPackagingItem[];
}): {
  increments: FillingUipIncrement[];
  missingMappings: string[];
  insufficientStock: string[];
} {
  const prev = filledByCode(args.previousLines);
  const next = filledByCode(args.newLines);
  const codes = new Set([...prev.keys(), ...next.keys()]);
  const increments: FillingUipIncrement[] = [];
  const missingMappings = new Set<string>();
  const insufficientStock: string[] = [];

  for (const productCode of codes) {
    const delta = (next.get(productCode) ?? 0) - (prev.get(productCode) ?? 0);
    if (delta === 0) continue;

    const packing = args.catalog.find((p) => key(p.code) === productCode);
    if (!packing) {
      if (!isFillingContainerSizeCode(productCode)) {
        missingMappings.add(`No catalog packing for code "${productCode}"`);
      }
      continue;
    }

    const primaryKind = containerKind(packing);
    const primary = findProductItem(args.packagingItems, packing, primaryKind);
    if (primary) {
      increments.push({
        itemCode: primary.code,
        itemName: primary.name,
        quantity: delta,
        detail: `${delta > 0 ? "+" : ""}${delta} ${packing.name} ${primaryKind}s (filling)`,
      });
    } else {
      missingMappings.add(`No ${primaryKind} packaging item mapped for ${packing.name}`);
    }

    const cap = findProductItem(args.packagingItems, packing, "cap");
    if (cap) {
      increments.push({
        itemCode: cap.code,
        itemName: cap.name,
        quantity: delta,
        detail: `${delta > 0 ? "+" : ""}${delta} ${packing.name} caps (filling)`,
      });
    }

    if (packing.bundleComponents?.length) {
      for (const ref of packing.bundleComponents) {
        const part = args.catalog.find((p) => key(p.code) === key(ref.code));
        if (!part) continue;
        const partKind = containerKind(part);
        const partItem = findProductItem(args.packagingItems, part, partKind);
        if (partItem) {
          const qty = delta * ref.bottlesPerUnit;
          increments.push({
            itemCode: partItem.code,
            itemName: partItem.name,
            quantity: qty,
            detail: `${qty > 0 ? "+" : ""}${qty} ${part.name} ${partKind}s (bundle fill)`,
          });
        }
      }
    }
  }

  const grouped = new Map<string, FillingUipIncrement>();
  for (const inc of increments) {
    const g = grouped.get(inc.itemCode);
    if (g) {
      g.quantity += inc.quantity;
      g.detail = `${g.detail}; ${inc.detail}`;
    } else {
      grouped.set(inc.itemCode, { ...inc });
    }
  }

  const merged = [...grouped.values()];
  for (const inc of merged) {
    const item = args.packagingItems.find((i) => i.code === inc.itemCode);
    if (!item) continue;
    const bal = packagingBalance(item);
    if (inc.quantity > 0 && bal < inc.quantity) {
      insufficientStock.push(
        `Insufficient ${inc.itemName}: need ${inc.quantity}, balance ${bal} (Purchased − Rejected − UIP)`,
      );
    }
  }

  return {
    increments: merged,
    missingMappings: [...missingMappings],
    insufficientStock,
  };
}

export { packingCatalogFromDocs };
