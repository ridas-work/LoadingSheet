import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { buildSheetLines } from "@/lib/buildSheetLines";
import { connectToDatabase } from "@/lib/db";
import { Order } from "@/lib/models/Order";
import { roleFromSession } from "@/lib/roles";

type CreateOrderBody = {
  poNumber?: unknown;
  customerName?: unknown;
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
    .select("_id poNumber customerName createdAt sheetLines.batchNo")
    .lean();

  const list = orders.map((o) => {
    const lines = o.sheetLines ?? [];
    const total = lines.length;
    const filled = lines.filter((l) => typeof l.batchNo === "string" && l.batchNo.trim().length > 0).length;
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

  await connectToDatabase();

  const sheetLines = buildSheetLines(parsedItems);

  const created = await Order.create({
    poNumber: String(body.poNumber).trim(),
    customerName: String(body.customerName).trim(),
    items: parsedItems,
    sheetLines,
    createdByUserId: userId,
    createdByName: session.user.name ?? "",
  });

  return NextResponse.json({ id: created._id.toString() }, { status: 200 });
}
