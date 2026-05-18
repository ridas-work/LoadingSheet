import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { PackagingItem } from "@/lib/models/PackagingItem";
import { canViewPackagingInventory, serializePackagingItem } from "@/lib/packagingInventory";
import { roleFromSession } from "@/lib/roles";

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
  const category = url.searchParams.get("category")?.trim().toLowerCase();

  await connectToDatabase();

  const filter: Record<string, unknown> = { active: true };
  if (category) filter.category = category;

  const items = await PackagingItem.find(filter).sort({ category: 1, name: 1 }).lean();

  return NextResponse.json({
    items: items.map((item) => serializePackagingItem(item)),
  });
}
