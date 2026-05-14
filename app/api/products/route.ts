import { NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/db";
import { ProductPacking } from "@/lib/models/ProductPacking";

export async function GET() {
  await connectToDatabase();
  const list = await ProductPacking.find({ active: true })
    .sort({ name: 1 })
    .select({
      code: 1,
      name: 1,
      bottlesPerCarton: 1,
      litersPerBottle: 1,
      batchFamily: 1,
      bundleComponents: 1,
    })
    .lean();

  const products = list.map((p) => ({
    code: p.code,
    name: p.name,
    bottlesPerCarton: p.bottlesPerCarton,
    litersPerBottle: p.litersPerBottle ?? 1,
    batchFamily: p.batchFamily?.trim() || p.name,
    bundleComponents: (p.bundleComponents ?? []).map((c) => ({
      code: c.code,
      bottlesPerUnit: c.bottlesPerUnit,
    })),
  }));

  const seen = new Set<string>();
  const batchFamilies: Array<{ name: string; batchFamily: string }> = [];
  for (const p of products) {
    if (p.bundleComponents.length > 0) continue;
    if (seen.has(p.batchFamily)) continue;
    seen.add(p.batchFamily);
    batchFamilies.push({ name: p.batchFamily, batchFamily: p.batchFamily });
  }

  return NextResponse.json({ products, batchFamilies });
}
