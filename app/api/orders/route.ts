import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { buildSheetLines } from "@/lib/buildSheetLines";
import { connectToDatabase } from "@/lib/db";
import {
  buildMixedSampleSheetLines,
  mixedSampleItemsFromContents,
  type MixedSampleContent,
} from "@/lib/mixedSampleBox";
import { Order } from "@/lib/models/Order";
import { roleFromSession } from "@/lib/roles";

type CreateOrderBody = {
  poNumber?: unknown;
  customerName?: unknown;
  city?: unknown;
  deadlineDate?: unknown;
  orderKind?: unknown;
  mixedSample?: unknown;
  items?: unknown;
  productName?: unknown;
  bottles?: unknown;
};

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function toPositiveInt(v: unknown): number | null {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isInteger(n) || n < 1) return null;
  return n;
}

type ParsedItem = { productName: string; boxes: number; bottlesPerBox: number };

function parseMixedSample(body: Record<string, unknown>): {
  ok: true;
  boxCount: number;
  contents: MixedSampleContent[];
} | { ok: false; errors: Record<string, string> } {
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

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = roleFromSession(session.user as { role?: string });
  if (!role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectToDatabase();

  const orders = await Order.find({})
    .sort({ createdAt: -1 })
    .select("_id poNumber customerName createdAt sheetLines")
    .lean();

  const list = orders.map((o) => {
    const lines = o.sheetLines ?? [];
    const total = lines.length;
    const filled = lines.filter((l) => {
      if (l.lineKind === "mixed_sample") {
        const comps = l.componentBatches ?? [];
        return comps.length > 0 && comps.every((c) => c.batchNo?.trim());
      }
      return typeof l.batchNo === "string" && l.batchNo.trim().length > 0;
    }).length;
    return {
      id: o._id.toString(),
      poNumber: o.poNumber,
      customerName: o.customerName,
      createdAt: o.createdAt,
      batchProgress: { filled, total },
    };
  });

  return NextResponse.json({ orders: list });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (roleFromSession(session.user as { role?: string }) !== "po_creator") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const userId = (session.user as { id?: string }).id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as CreateOrderBody | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const errors: Record<string, string> = {};

  if (!isNonEmptyString(body.poNumber)) errors.poNumber = "PO number is required.";
  if (!isNonEmptyString(body.customerName)) errors.customerName = "Customer name is required.";

  const orderKind =
    body.orderKind === "mixed_sample" ? "mixed_sample" : ("standard" as const);

  const city = typeof body.city === "string" ? body.city.trim() : "";
  let deadlineDate: Date | null = null;
  if (typeof body.deadlineDate === "string" && body.deadlineDate.trim()) {
    const parsed = new Date(body.deadlineDate.trim());
    if (!Number.isNaN(parsed.getTime())) deadlineDate = parsed;
  }

  await connectToDatabase();

  if (orderKind === "mixed_sample") {
    const mixed = parseMixedSample(body as Record<string, unknown>);
    if (!mixed.ok) {
      return NextResponse.json({ errors: mixed.errors }, { status: 400 });
    }

    const sheetLines = buildMixedSampleSheetLines({
      boxCount: mixed.boxCount,
      contents: mixed.contents,
    });
    const items = mixedSampleItemsFromContents(mixed.contents);

    const created = await Order.create({
      poNumber: String(body.poNumber).trim(),
      customerName: String(body.customerName).trim(),
      city,
      deadlineDate,
      orderKind: "mixed_sample",
      mixedSample: { boxCount: mixed.boxCount, contents: mixed.contents },
      items,
      sheetLines,
      createdByUserId: userId,
      createdByName: session.user.name ?? "",
    });

    return NextResponse.json({ id: created._id.toString() }, { status: 200 });
  }

  const itemsRaw =
    Array.isArray(body.items) && body.items.length > 0
      ? body.items
      : isNonEmptyString(body.productName) && toPositiveInt(body.bottles)
        ? [{ productName: body.productName, boxes: body.bottles, bottlesPerBox: 10 }]
        : null;

  const itemsErrors: Record<string, string> = {};
  const parsedItems: ParsedItem[] = [];

  if (!itemsRaw) {
    errors.items = "At least one product is required.";
  } else {
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
    if (parsedItems.length === 0 && Object.keys(itemsErrors).length === 0) {
      errors.items = "At least one valid product is required.";
    }
  }

  const merged = { ...errors, ...itemsErrors };
  if (Object.keys(merged).length > 0) {
    return NextResponse.json({ errors: merged }, { status: 400 });
  }

  const sheetLines = buildSheetLines(parsedItems);

  const created = await Order.create({
    poNumber: String(body.poNumber).trim(),
    customerName: String(body.customerName).trim(),
    city,
    deadlineDate,
    orderKind: "standard",
    items: parsedItems,
    sheetLines,
    createdByUserId: userId,
    createdByName: session.user.name ?? "",
  });

  return NextResponse.json({ id: created._id.toString() }, { status: 200 });
}
