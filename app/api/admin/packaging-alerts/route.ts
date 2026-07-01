import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { PackagingItem } from "@/lib/models/PackagingItem";
import { buildPackagingReorderAlerts } from "@/lib/packagingReorderAlerts";
import { isAdmin, roleFromSession } from "@/lib/roles";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = roleFromSession(session.user as { role?: string });
  if (!isAdmin(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectToDatabase();
  const items = await PackagingItem.find({ active: true }).lean();
  const report = buildPackagingReorderAlerts(items);

  return NextResponse.json(report, {
    headers: { "Cache-Control": "no-store" },
  });
}
