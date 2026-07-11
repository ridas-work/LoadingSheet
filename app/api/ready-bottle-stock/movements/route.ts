import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { ReadyBottleMovement } from "@/lib/models/ReadyBottleMovement";
import { canViewDispatchReadyStock, roleFromSession } from "@/lib/roles";

function canView(role: ReturnType<typeof roleFromSession>, username?: string | null): boolean {
  return canViewDispatchReadyStock(role, username);
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = roleFromSession(session.user as { role?: string });
  const username = (session.user as { username?: string })?.username;
  if (!canView(role, username)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") ?? 50)));

  await connectToDatabase();
  const rows = await ReadyBottleMovement.find({})
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return NextResponse.json({
    movements: rows.map((m) => ({
      id: m._id.toString(),
      productCode: m.productCode,
      productName: m.productName,
      delta: m.delta,
      onHandAfter: m.onHandAfter,
      reason: m.reason,
      note: m.note ?? "",
      batchNo: m.batchNo ?? "",
      poNumber: m.poNumber ?? "",
      entryDate: m.entryDate ?? "",
      recordedByName: m.recordedByName ?? "",
      createdAt: m.createdAt ? new Date(m.createdAt).toISOString() : null,
    })),
  });
}
