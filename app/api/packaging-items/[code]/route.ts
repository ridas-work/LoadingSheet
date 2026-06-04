import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { PackagingItem } from "@/lib/models/PackagingItem";
import { PackagingStockMovement } from "@/lib/models/PackagingStockMovement";
import {
  canEditPackagingInventory,
  canViewPackagingInventory,
  packagingBalance,
  parseNonNegativeInt,
  serializePackagingItem,
} from "@/lib/packagingInventory";
import { roleFromSession } from "@/lib/roles";

type RouteCtx = { params: Promise<{ code: string }> };

export async function GET(_req: Request, ctx: RouteCtx) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = roleFromSession(session.user as { role?: string });
  if (!canViewPackagingInventory(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { code } = await ctx.params;
  const itemCode = decodeURIComponent(code).trim().toLowerCase();
  if (!itemCode) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  await connectToDatabase();
  const item = await PackagingItem.findOne({ code: itemCode, active: true }).lean();
  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const movements = await PackagingStockMovement.find({ itemCode })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  return NextResponse.json({
    item: serializePackagingItem(item),
    movements: movements.map((m) => ({
      id: m._id.toString(),
      quantityDelta: m.quantityDelta,
      quantityAfter: m.quantityAfter,
      reason: m.reason,
      note: m.note ?? "",
      recordedByName: m.recordedByName ?? "",
      createdAt: m.createdAt,
    })),
  });
}

export async function PATCH(req: Request, ctx: RouteCtx) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = roleFromSession(session.user as { role?: string });
  if (!canEditPackagingInventory(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const haiderOnlyLedger = role === "packaging_editor";

  const userId = (session.user as { id?: string }).id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { code } = await ctx.params;
  const itemCode = decodeURIComponent(code).trim().toLowerCase();
  if (!itemCode) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as {
    purchasedQty?: unknown;
    rejectedDamage?: unknown;
    uip?: unknown;
    onHand?: unknown;
    note?: unknown;
  } | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const note = typeof body.note === "string" ? body.note.trim() : "";

  await connectToDatabase();
  const item = await PackagingItem.findOne({ code: itemCode, active: true });
  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const beforePurchased = item.purchasedQty ?? 0;
  const beforeRejected = item.rejectedDamage ?? 0;
  const before = packagingBalance(item);

  if (haiderOnlyLedger && body.uip !== undefined) {
    return NextResponse.json(
      { error: "UIP is updated automatically from filling and delivered orders." },
      { status: 400 },
    );
  }

  if (body.onHand !== undefined && body.purchasedQty === undefined) {
    const legacy = parseNonNegativeInt(body.onHand, "onHand");
    if (typeof legacy === "object") {
      return NextResponse.json({ error: legacy.error }, { status: 400 });
    }
    item.purchasedQty = legacy;
    item.rejectedDamage = 0;
    item.uip = 0;
  } else {
    if (body.purchasedQty !== undefined) {
      const v = parseNonNegativeInt(body.purchasedQty, "Purchased Qty");
      if (typeof v === "object") return NextResponse.json({ error: v.error }, { status: 400 });
      item.purchasedQty = v;
    }
    if (body.rejectedDamage !== undefined) {
      const v = parseNonNegativeInt(body.rejectedDamage, "Rejected / Damage");
      if (typeof v === "object") return NextResponse.json({ error: v.error }, { status: 400 });
      item.rejectedDamage = v;
    }
    if (!haiderOnlyLedger && body.uip !== undefined) {
      const v = parseNonNegativeInt(body.uip, "UIP");
      if (typeof v === "object") return NextResponse.json({ error: v.error }, { status: 400 });
      item.uip = v;
    }
  }

  const after = packagingBalance(item);

  if (after === before && !note) {
    return NextResponse.json({ item: serializePackagingItem(item) });
  }

  item.onHand = after;
  await item.save();

  const purchasedChanged = (item.purchasedQty ?? 0) !== beforePurchased;
  const rejectedChanged = (item.rejectedDamage ?? 0) !== beforeRejected;
  let reason: "purchase_adjust" | "rejected" | "count" = "count";
  if (purchasedChanged && !rejectedChanged) reason = "purchase_adjust";
  else if (rejectedChanged && !purchasedChanged) reason = "rejected";
  else if (purchasedChanged || rejectedChanged) reason = "purchase_adjust";

  await PackagingStockMovement.create({
    itemCode,
    quantityDelta: after - before,
    quantityAfter: after,
    reason,
    note: note || (purchasedChanged ? "Purchased qty updated" : "Rejected/damage updated"),
    recordedByUserId: userId,
    recordedByName: session.user.name ?? "",
  });

  return NextResponse.json({ item: serializePackagingItem(item) });
}
