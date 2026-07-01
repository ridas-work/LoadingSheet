import {
  inferBottleSizeCodeFromSavedLine,
  inferLitersForCustomLine,
} from "@/lib/customBottleSizes";
import { findPackingByName, type PackingCatalogRow } from "@/lib/bundleCatalog";

export type MixedSampleContent = {
  productName: string;
  bottles: number;
  bottleSizeCode?: string;
  /** Catalog packing code when picked from the product list (fabrito-fabric-softener-pouch, etc.). */
  packingCode?: string;
};

export type MixedSampleInput = {
  boxCount: number;
  contents: MixedSampleContent[];
  customBoxCode?: string;
};

export type MixedSheetLine = {
  boxNo: number;
  productName: string;
  bottlesPerBox: number;
  batchNo: string;
  weight: number | null;
  lineKind: "mixed_sample";
  mixedContents: MixedSampleContent[];
  componentBatches: Array<{ productName: string; batchNo: string }>;
  customBoxCode?: string;
};

export function isMixedSampleLine(
  line: { lineKind?: string | null; mixedContents?: Array<{ productName: string; bottles: number }> | null },
): boolean {
  if (line.lineKind === "mixed_sample") return true;
  return Boolean(line.mixedContents && line.mixedContents.length > 0);
}

export function formatMixedSampleLabel(contents: MixedSampleContent[]): string {
  if (contents.length === 0) return "Mixed sample box";
  const parts = contents.map((c) => `${c.productName.trim()} ×${c.bottles}`);
  return `Mixed sample: ${parts.join(", ")}`;
}

export function totalBottlesInMix(contents: MixedSampleContent[]): number {
  return contents.reduce((sum, c) => sum + c.bottles, 0);
}

export function buildMixedSampleSheetLines(input: MixedSampleInput): MixedSheetLine[] {
  const label = formatMixedSampleLabel(input.contents);
  const totalBottles = totalBottlesInMix(input.contents);
  const lines: MixedSheetLine[] = [];

  for (let i = 0; i < input.boxCount; i++) {
    lines.push({
      boxNo: i + 1,
      productName: label,
      bottlesPerBox: totalBottles,
      batchNo: "",
      weight: null,
      lineKind: "mixed_sample",
      mixedContents: input.contents.map((c) => ({
        productName: c.productName,
        bottles: c.bottles,
        ...(c.bottleSizeCode?.trim() ? { bottleSizeCode: c.bottleSizeCode.trim().toLowerCase() } : {}),
        ...(c.packingCode?.trim() ? { packingCode: c.packingCode.trim().toLowerCase() } : {}),
      })),
      componentBatches: input.contents.map((c) => ({
        productName: c.productName,
        batchNo: "",
      })),
      ...(input.customBoxCode?.trim() ? { customBoxCode: input.customBoxCode.trim().toLowerCase() } : {}),
    });
  }

  return lines;
}

export function resolveMixedSampleParts(
  line: { mixedContents?: MixedSampleContent[] | null },
  catalog: PackingCatalogRow[],
): Array<{ productName: string; bottlesPerUnit: number; litersPerBottle: number }> {
  return (line.mixedContents ?? []).map((c) => {
    const packing = findPackingByName(c.productName, catalog);
    const storedCode = c.bottleSizeCode?.trim();
    const sizeCode =
      storedCode && storedCode !== "catalog"
        ? storedCode
        : inferBottleSizeCodeFromSavedLine(c.productName, packing?.name, storedCode);
    return {
      productName: c.productName,
      bottlesPerUnit: c.bottles,
      litersPerBottle: inferLitersForCustomLine(
        c.productName,
        sizeCode !== "catalog" ? sizeCode : null,
      ),
    };
  });
}

export function mixedSampleItemsFromContents(
  contents: MixedSampleContent[],
): Array<{ productName: string; boxes: number; bottlesPerBox: number }> {
  return contents.map((c) => ({
    productName: c.productName,
    boxes: 1,
    bottlesPerBox: c.bottles,
  }));
}
