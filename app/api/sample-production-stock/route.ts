import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { packingCatalogFromDocs } from "@/lib/catalogFromDb";
import { connectToDatabase } from "@/lib/db";
import { ProductPacking } from "@/lib/models/ProductPacking";
import { isAdmin, roleFromSession } from "@/lib/roles";
import { samplePoolForCatalog } from "@/lib/sampleProductionStock";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = roleFromSession(session.user as { role?: string });
  if (!isAdmin(role) && role !== "batch_editor" && role !== "po_creator") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectToDatabase();
  const catalogDocs = await ProductPacking.find({ active: true })
    .select({ code: 1, name: 1, bottlesPerCarton: 1, litersPerBottle: 1, aliases: 1, batchFamily: 1 })
    .lean();
  const catalog = packingCatalogFromDocs(catalogDocs);
  const pool = await samplePoolForCatalog(catalog);

  return NextResponse.json({ pool });
}
