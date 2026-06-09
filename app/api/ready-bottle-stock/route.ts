import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { packingCatalogFromDocs } from "@/lib/catalogFromDb";
import { connectToDatabase } from "@/lib/db";
import { ProductPacking } from "@/lib/models/ProductPacking";
import { listBatchLots, listReadyStockWithCatalog } from "@/lib/readyBottleLedger";
import { canEditDispatch, isAdmin, roleFromSession } from "@/lib/roles";

function canView(role: ReturnType<typeof roleFromSession>): boolean {
  return canEditDispatch(role) || isAdmin(role);
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = roleFromSession(session.user as { role?: string });
  if (!canView(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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
