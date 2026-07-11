import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { isMarketVisitRep } from "@/lib/fieldVisitTickets";
import { fetchOpenAlertsByStoreKeys } from "@/lib/marketVisitAlerts";
import { isAdmin, roleFromSession } from "@/lib/roles";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = roleFromSession(session.user as { role?: string });
  const username = (session.user as { username?: string })?.username;
  if (!isAdmin(role) && !isMarketVisitRep(username)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const raw = url.searchParams.get("storeKeys")?.trim() ?? "";
  const storeKeys = raw
    .split(",")
    .map((key) => key.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 50);

  await connectToDatabase();
  const alertsByStoreKey = await fetchOpenAlertsByStoreKeys(storeKeys);

  return NextResponse.json({ alertsByStoreKey });
}
