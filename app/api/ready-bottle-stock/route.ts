import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { packingCatalogFromDocs } from "@/lib/catalogFromDb";
import { connectToDatabase } from "@/lib/db";
import { ProductPacking } from "@/lib/models/ProductPacking";
import { listBatchLots, listReadyStockWithCatalog } from "@/lib/readyBottleLedger";
import { canViewDispatchReadyStock, roleFromSession } from "@/lib/roles";

function canView(role: ReturnType<typeof roleFromSession>, username?: string | null): boolean {
  return canViewDispatchReadyStock(role, username);
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = roleFromSession(session.user as { role?: string });
  const username = (session.user as { username?: string })?.username;
  if (!canView(role, username)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await connectToDatabase();
  const catalogDocs = await ProductPacking.find({ active: true })
    .select({ code: 1, name: 1 })
    .lean();
  const catalog = packingCatalogFromDocs(catalogDocs);
  const [products, batchLots] = await Promise.all([
    listReadyStockWithCatalog(catalog.map((p) => ({ code: p.code, name: p.name }))),
    listBatchLots(),
  ]);

  return NextResponse.json({ products, batchLots });
}
