import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import {
  listCustomCartonProducts,
  upsertCustomCartonProduct,
} from "@/lib/customCartonProductStore";
import { connectToDatabase } from "@/lib/db";
import { canCreateOrders, isAdmin, roleFromSession } from "@/lib/roles";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = roleFromSession(session.user as { role?: string });
  if (!canCreateOrders(role) && !isAdmin(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectToDatabase();
  const products = await listCustomCartonProducts();
  return NextResponse.json({ products });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = roleFromSession(session.user as { role?: string });
  if (!canCreateOrders(role) && !isAdmin(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as { name?: unknown } | null;
  const name = typeof body?.name === "string" ? body.name : "";
  if (!name.trim()) {
    return NextResponse.json({ error: "Product name is required." }, { status: 400 });
  }

  await connectToDatabase();
  const result = await upsertCustomCartonProduct(name, {
    userId: (session.user as { id?: string }).id,
    name: session.user.name ?? "",
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ product: result });
}
