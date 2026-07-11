import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { buildMarketVisitGridReport } from "@/lib/marketVisitAlertReport";
import { canViewAdminReports, roleFromSession } from "@/lib/roles";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = roleFromSession(session.user as { role?: string });
  const username = (session.user as { username?: string })?.username;
  if (!canViewAdminReports(role, username)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const store = url.searchParams.get("store")?.trim() ?? "";

  await connectToDatabase();
  const report = await buildMarketVisitGridReport({ storeQuery: store });

  return NextResponse.json(report);
}
