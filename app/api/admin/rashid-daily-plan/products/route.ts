import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { loadRashidPlanProducts } from "@/lib/rashidPlanProducts";
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

  return NextResponse.json(
    { products: loadRashidPlanProducts() },
    { headers: { "Cache-Control": "private, max-age=3600" } },
  );
}
