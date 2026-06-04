import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { PackagingStockMovement } from "@/lib/models/PackagingStockMovement";
import { canViewPackagingInventory, roleFromSession } from "@/lib/roles";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = roleFromSession(session.user as { role?: string });
  if (!canViewPackagingInventory(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? 50) || 50));
  const itemCode = url.searchParams.get("itemCode")?.trim().toLowerCase() ?? "";

  await connectToDatabase();

  const filter = itemCode ? { itemCode } : {};
  const movements = await PackagingStockMovement.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return NextResponse.json({
    movements: movements.map((m) => ({
      id: m._id.toString(),
      itemCode: m.itemCode,
      quantityDelta: m.quantityDelta,
      quantityAfter: m.quantityAfter,
      reason: m.reason,
      note: m.note ?? "",
      recordedByName: m.recordedByName ?? "",
      createdAt: m.createdAt ? new Date(m.createdAt).toISOString() : "",
    })),
  });
}
