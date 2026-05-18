import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { PackagingItem } from "@/lib/models/PackagingItem";
import { PackagingStockMovement } from "@/lib/models/PackagingStockMovement";
import { canViewPackagingInventory, serializePackagingItem } from "@/lib/packagingInventory";
import { canEditDispatch, roleFromSession } from "@/lib/roles";

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
  if (!canEditDispatch(roleFromSession(session.user as { role?: string }))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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
    onHand?: unknown;
    note?: unknown;
  } | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const onHand =
    typeof body.onHand === "number" ? body.onHand : Number(body.onHand);
  if (!Number.isFinite(onHand) || !Number.isInteger(onHand) || onHand < 0) {
    return NextResponse.json(
      { error: "onHand must be a whole number ≥ 0" },
      { status: 400 },
    );
  }

  const note = typeof body.note === "string" ? body.note.trim() : "";

  await connectToDatabase();
  const item = await PackagingItem.findOne({ code: itemCode, active: true });
  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const previous = item.onHand ?? 0;
  const quantityDelta = onHand - previous;

  if (quantityDelta === 0 && !note) {
    return NextResponse.json({ item: serializePackagingItem(item) });
  }

  item.onHand = onHand;
  await item.save();

  await PackagingStockMovement.create({
    itemCode,
    quantityDelta,
    quantityAfter: onHand,
    reason: "count",
    note,
    recordedByUserId: userId,
    recordedByName: session.user.name ?? "",
  });

  return NextResponse.json({ item: serializePackagingItem(item) });
}
