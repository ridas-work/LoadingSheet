import { customCartonBoxLabel } from "@/lib/customCartonBoxes";
import { formatMixedContentLine } from "@/lib/mixedContentDisplay";
import type { SubtractedItemRecord } from "@/lib/subtractedItems";

export type PoDetailSection = {
  title: string;
  lines: string[];
};

export type OrderPoDetail = {
  sections: PoDetailSection[];
  hasCustomBoxes: boolean;
};

type MixedContentRow = {
  productName?: string;
  bottles?: number;
  bottleSizeCode?: string;
  packingCode?: string;
};

export type OrderPoDetailInput = {
  orderKind?: string | null;
  items?: Array<{ productName?: string; boxes?: number; bottlesPerBox?: number }>;
  mixedSample?: {
    boxCount?: number;
    contents?: MixedContentRow[];
  } | null;
  customCartons?: Array<{
    boxCount?: number;
    label?: string;
    customBoxCode?: string;
    contents?: MixedContentRow[];
  }>;
  subtractedItems?: SubtractedItemRecord[];
};

function subtractedQtyLabel(item: SubtractedItemRecord): string {
  const name = item.productName.trim();
  const isMixedCarton =
    name.startsWith("Mixed sample:") ||
    name.startsWith("Custom box:") ||
    name.includes(" ×");
  if (isMixedCarton) {
    if (item.boxes === 1 && item.bottlesPerBox > 1) {
      return `1 carton (${item.bottlesPerBox} units inside)`;
    }
    return `${item.boxes} carton${item.boxes !== 1 ? "s" : ""} × ${item.bottlesPerBox} units inside`;
  }
  if (item.bottlesPerBox === 1) {
    return `${item.boxes} bottle${item.boxes !== 1 ? "s" : ""}`;
  }
  return `${item.boxes} ct × ${item.bottlesPerBox}`;
}

function formatContentRows(rows: MixedContentRow[]): string[] {
  return rows
    .filter((c) => c.productName?.trim() && (c.bottles ?? 0) >= 1)
    .map((c) =>
      formatMixedContentLine({
        productName: c.productName!.trim(),
        bottles: c.bottles!,
        bottleSizeCode: c.bottleSizeCode,
        packingCode: c.packingCode,
      }),
    );
}

export function buildOrderPoDetail(order: OrderPoDetailInput): OrderPoDetail {
  const sections: PoDetailSection[] = [];

  if (order.orderKind === "mixed_sample" && order.mixedSample?.contents?.length) {
    const boxCount =
      typeof order.mixedSample.boxCount === "number" && order.mixedSample.boxCount >= 1
        ? order.mixedSample.boxCount
        : 1;
    const lines = formatContentRows(order.mixedSample.contents);
    if (lines.length > 0) {
      sections.push({
        title:
          boxCount > 1 ? `Mixed sample box (×${boxCount} identical)` : "Mixed sample box",
        lines,
      });
    }
    return { sections, hasCustomBoxes: false };
  }

  const standardLines: string[] = [];
  for (const item of order.items ?? []) {
    const name = item.productName?.trim();
    const boxes = typeof item.boxes === "number" ? item.boxes : 0;
    const bpb = typeof item.bottlesPerBox === "number" && item.bottlesPerBox >= 1 ? item.bottlesPerBox : 10;
    if (!name || boxes < 1) continue;
    standardLines.push(
      `${name} — ${boxes} carton${boxes !== 1 ? "s" : ""} × ${bpb} bottles`,
    );
  }
  if (standardLines.length > 0) {
    sections.push({ title: "Standard cartons", lines: standardLines });
  }

  const customCartons = order.customCartons ?? [];
  customCartons.forEach((carton, index) => {
    const boxCount = typeof carton.boxCount === "number" && carton.boxCount >= 1 ? carton.boxCount : 1;
    const label = carton.label?.trim();
    const outer = carton.customBoxCode?.trim()
      ? customCartonBoxLabel(carton.customBoxCode)
      : "";
    let title = label || `Custom box ${index + 1}`;
    if (outer) title += ` · ${outer}`;
    if (boxCount > 1) title += ` (×${boxCount} identical)`;

    const lines = formatContentRows(carton.contents ?? []);
    if (lines.length > 0) {
      sections.push({ title, lines });
    }
  });

  const pending = (order.subtractedItems ?? []).filter((item) => item.status === "pending");
  if (pending.length > 0) {
    sections.push({
      title: "Pending for later dispatch",
      lines: pending.map((item) => `${item.productName} — ${subtractedQtyLabel(item)}`),
    });
  }

  return {
    sections,
    hasCustomBoxes: customCartons.length > 0,
  };
}
