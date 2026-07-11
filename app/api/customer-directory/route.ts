import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { listCustomerDirectory } from "@/lib/customerDirectoryStore";
import { connectToDatabase } from "@/lib/db";
import { canCreateOrders, canOpenCustomerAccounts, roleFromSession } from "@/lib/roles";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = roleFromSession(session.user as { role?: string });
  if (!canCreateOrders(role) && !canOpenCustomerAccounts(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectToDatabase();
  const customers = await listCustomerDirectory();
  return NextResponse.json({ customers });
}
