import { buildMixedSampleSheetLines, mixedSampleItemsFromContents, type MixedSampleContent } from "@/lib/mixedSampleBox";
import { buildSheetLines, type OrderItemInput, type SheetLine } from "@/lib/buildSheetLines";
import { mergeStandardAndCustomSheetLines, type CustomCartonDef } from "@/lib/hybridSheetLines";

export type OrderBody = {
  poNumber?: unknown;
  customerName?: unknown;
  city?: unknown;
  deadlineDate?: unknown;
  orderKind?: unknown;
  mixedSample?: unknown;
  items?: unknown;
  customCartons?: unknown;
  productName?: unknown;
  bottles?: unknown;
};

export type ParsedOrderItem = OrderItemInput;

export type ParsedOrderPayload = {
  poNumber: string;
  customerName: string;
  city: string;
  deadlineDate: Date | null;
  orderKind: "standard" | "mixed_sample" | "hybrid";
  items: ParsedOrderItem[];
  mixedSample: { boxCount: number; contents: MixedSampleContent[] } | null;
  /** Multi-product cartons alongside standard lines; empty unless hybrid (or unused). */
  customCartons: CustomCartonDef[];
  sheetLines: SheetLine[];
};

export type { CustomCartonDef };

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function toPositiveInt(v: unknown): number | null {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isInteger(n) || n < 1) return null;
  return n;
}

function parseMixedSample(body: Record<string, unknown>):
  | { ok: true; boxCount: number; contents: MixedSampleContent[] }
  | { ok: false; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const raw = body.mixedSample as Record<string, unknown> | undefined;
  if (!raw || typeof raw !== "object") {
    return { ok: false, errors: { mixedSample: "Mixed sample details are required." } };
  }

  const boxCount = toPositiveInt(raw.boxCount);
  if (boxCount === null) {
    errors.mixedBoxCount = "Number of mixed boxes must be an integer ≥ 1.";
  }

  const contents: MixedSampleContent[] = [];
  if (Array.isArray(raw.contents)) {
    (raw.contents as unknown[]).forEach((row, idx) => {
      const it = row as Record<string, unknown>;
      const productName = typeof it.productName === "string" ? it.productName.trim() : "";
      const bottles = toPositiveInt(it.bottles);
      if (!productName) {
        errors[`mixed.contents.${idx}.productName`] = "Product name is required.";
      }
      if (bottles === null) {
        errors[`mixed.contents.${idx}.bottles`] = "Bottles must be an integer ≥ 1.";
      }
      if (productName && bottles !== null) {
        contents.push({ productName, bottles });
      }
    });
  }

  if (contents.length === 0 && !errors.mixedSample) {
    errors.mixedSample = "Add at least one product with bottles ≥ 1.";
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, boxCount: boxCount!, contents };
}

function parseCustomCartons(body: Record<string, unknown>):
  | { ok: true; cartons: CustomCartonDef[] }
  | { ok: false; errors: Record<string, string> } {
  const raw = body.customCartons;
  if (raw === undefined || raw === null) {
    return { ok: true, cartons: [] };
  }
  if (!Array.isArray(raw)) {
    return { ok: false, errors: { customCartons: "customCartons must be an array when provided." } };
  }

  const errors: Record<string, string> = {};
  const cartons: CustomCartonDef[] = [];

  raw.forEach((entry, ci) => {
    if (!entry || typeof entry !== "object") {
      errors[`customCartons.${ci}`] = "Invalid carton entry.";
      return;
    }
    const obj = entry as Record<string, unknown>;
    const boxCount = toPositiveInt(obj.boxCount);
    if (boxCount === null) {
      errors[`customCartons.${ci}.boxCount`] = "Number of identical cartons must be an integer ≥ 1.";
    }
    const label = typeof obj.label === "string" ? obj.label.trim() : "";
    const contents: MixedSampleContent[] = [];
    if (Array.isArray(obj.contents)) {
      (obj.contents as unknown[]).forEach((row, ri) => {
        const it = row as Record<string, unknown>;
        const productName = typeof it.productName === "string" ? it.productName.trim() : "";
        const bottles = toPositiveInt(it.bottles);
        if (!productName) {
          errors[`customCartons.${ci}.contents.${ri}.productName`] = "Product name is required.";
        }
        if (bottles === null) {
          errors[`customCartons.${ci}.contents.${ri}.bottles`] = "Bottles must be an integer ≥ 1.";
        }
        if (productName && bottles !== null) {
          contents.push({ productName, bottles });
        }
      });
    }
    if (contents.length === 0) {
      errors[`customCartons.${ci}.contents`] = "Add at least one product line in this carton.";
    }
    if (boxCount !== null && contents.length > 0) {
      cartons.push({
        boxCount,
        contents,
        ...(label ? { label } : {}),
      });
    }
  });

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, cartons };
}

export function parseOrderBody(
  body: OrderBody | null,
): { ok: true; payload: ParsedOrderPayload } | { ok: false; errors: Record<string, string> } {
  if (!body) {
    return { ok: false, errors: { body: "Invalid JSON body" } };
  }

  const errors: Record<string, string> = {};

  if (!isNonEmptyString(body.poNumber)) errors.poNumber = "PO number is required.";
  if (!isNonEmptyString(body.customerName)) errors.customerName = "Customer name is required.";

  const orderKindInput =
    body.orderKind === "mixed_sample" ? ("mixed_sample" as const) : ("standard" as const);

  const city = typeof body.city === "string" ? body.city.trim() : "";
  let deadlineDate: Date | null = null;
  if (typeof body.deadlineDate === "string" && body.deadlineDate.trim()) {
    const parsed = new Date(body.deadlineDate.trim());
    if (!Number.isNaN(parsed.getTime())) deadlineDate = parsed;
  }

  const poNumber = String(body.poNumber ?? "").trim();
  const customerName = String(body.customerName ?? "").trim();

  if (orderKindInput === "mixed_sample") {
    const mixed = parseMixedSample(body as Record<string, unknown>);
    if (!mixed.ok) {
      return { ok: false, errors: mixed.errors };
    }

    const sheetLines = buildMixedSampleSheetLines({
      boxCount: mixed.boxCount,
      contents: mixed.contents,
    });
    const items = mixedSampleItemsFromContents(mixed.contents);

    return {
      ok: true,
      payload: {
        poNumber,
        customerName,
        city,
        deadlineDate,
        orderKind: "mixed_sample",
        items,
        mixedSample: { boxCount: mixed.boxCount, contents: mixed.contents },
        customCartons: [],
        sheetLines,
      },
    };
  }

  const itemsRaw: unknown[] = [];
  if (Array.isArray(body.items) && body.items.length > 0) {
    itemsRaw.push(...body.items);
  } else if (isNonEmptyString(body.productName) && toPositiveInt(body.bottles)) {
    itemsRaw.push({ productName: body.productName, boxes: body.bottles, bottlesPerBox: 10 });
  }

  const itemsErrors: Record<string, string> = {};
  const parsedItems: ParsedOrderItem[] = [];

  (itemsRaw as unknown[]).forEach((raw: unknown, idx: number) => {
    const it = raw as Record<string, unknown>;
    const pn = typeof it?.productName === "string" ? it.productName.trim() : "";

    const boxesFromBoxes = toPositiveInt(it?.boxes);
    const legacyBottles = toPositiveInt(it?.bottles);
    const boxes = boxesFromBoxes ?? legacyBottles;

    const bpbRaw = it?.bottlesPerBox ?? it?.bottles_per_box;
    const bottlesPerBox = bpbRaw === undefined || bpbRaw === "" ? 10 : toPositiveInt(bpbRaw);
    if (bottlesPerBox === null) {
      itemsErrors[`items.${idx}.bottlesPerBox`] = "Bottles per carton must be an integer ≥ 1.";
    }

    if (!pn) itemsErrors[`items.${idx}.productName`] = "Product name is required.";
    if (boxes === null) {
      itemsErrors[`items.${idx}.boxes`] = "Number of cartons is required (integer ≥ 1).";
    }
    if (pn && boxes !== null && bottlesPerBox !== null) {
      parsedItems.push({ productName: pn, boxes, bottlesPerBox });
    }
  });

  const ccParsed = parseCustomCartons(body as Record<string, unknown>);
  if (!ccParsed.ok) {
    return { ok: false, errors: ccParsed.errors };
  }
  const customCartons = ccParsed.cartons;

  const merged = { ...errors, ...itemsErrors };
  if (Object.keys(merged).length > 0) {
    return { ok: false, errors: merged };
  }

  if (parsedItems.length === 0 && customCartons.length === 0) {
    return {
      ok: false,
      errors: { items: "Enter at least one standard product line or add a custom carton." },
    };
  }

  const sheetLines = mergeStandardAndCustomSheetLines(parsedItems, customCartons);
  const orderKind: "standard" | "hybrid" = customCartons.length > 0 ? "hybrid" : "standard";

  return {
    ok: true,
    payload: {
      poNumber,
      customerName,
      city,
      deadlineDate,
      orderKind,
      items: parsedItems,
      mixedSample: null,
      customCartons,
      sheetLines,
    },
  };
}
