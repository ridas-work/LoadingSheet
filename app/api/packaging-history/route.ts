import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { PackagingItem } from "@/lib/models/PackagingItem";
import { PackagingStockMovement } from "@/lib/models/PackagingStockMovement";
import {
  buildPackagingChangeHistory,
  buildPackagingDailySnapshots,
  parseHistoryDate,
  toDateKey,
} from "@/lib/packagingHistory";
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
  const view = url.searchParams.get("view") === "daily" ? "daily" : "changes";
  const category = url.searchParams.get("category")?.trim().toLowerCase() ?? "";
  const itemCode = url.searchParams.get("itemCode")?.trim().toLowerCase() ?? "";
  const q = url.searchParams.get("q")?.trim().toLowerCase() ?? "";

  const today = toDateKey(new Date());
  const defaultFrom = new Date();
  defaultFrom.setDate(defaultFrom.getDate() - 30);
  const from = url.searchParams.get("from")?.trim() || toDateKey(defaultFrom);
  const to = url.searchParams.get("to")?.trim() || today;

  if (!parseHistoryDate(from) || !parseHistoryDate(to)) {
    return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
  }
  if (from > to) {
    return NextResponse.json({ error: "From date must be on or before to date" }, { status: 400 });
  }

  await connectToDatabase();

  const itemFilter: Record<string, unknown> = { active: true };
  if (category) itemFilter.category = category;
  if (itemCode) itemFilter.code = itemCode;
  if (q) {
    itemFilter.$or = [
      { name: { $regex: q, $options: "i" } },
      { code: { $regex: q, $options: "i" } },
    ];
  }

  const items = await PackagingItem.find(itemFilter)
    .select({ code: 1, name: 1, category: 1, unit: 1 })
    .sort({ sortOrder: 1, name: 1 })
    .lean();

  const codes = items.map((item) => item.code);
  if (codes.length === 0) {
    return NextResponse.json({ view, from, to, entries: [], snapshots: [] });
  }

  const toEnd = new Date(parseHistoryDate(to)!);
  toEnd.setHours(23, 59, 59, 999);

  const movements = await PackagingStockMovement.find({
    itemCode: { $in: codes },
    createdAt: { $lte: toEnd },
  })
    .select({
      itemCode: 1,
      quantityDelta: 1,
      quantityAfter: 1,
      reason: 1,
      note: 1,
      recordedByName: 1,
      createdAt: 1,
    })
    .sort({ createdAt: 1 })
    .lean();

  const changeEntries = buildPackagingChangeHistory(items, movements, from, to);
  const dailySnapshots =
    view === "daily" ? buildPackagingDailySnapshots(items, movements, from, to) : [];

  return NextResponse.json({
    view,
    from,
    to,
    entries: changeEntries,
    snapshots: dailySnapshots,
  });
}
