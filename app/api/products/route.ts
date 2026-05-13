import { NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/db";
import { ProductPacking } from "@/lib/models/ProductPacking";

export async function GET() {
  await connectToDatabase();
  const list = await ProductPacking.find({ active: true })
    .sort({ name: 1 })
    .select({ code: 1, name: 1, bottlesPerCarton: 1, litersPerBottle: 1 })
    .lean();

  return NextResponse.json(
    list.map((p) => ({
      code: p.code,
      name: p.name,
      bottlesPerCarton: p.bottlesPerCarton,
      litersPerBottle: p.litersPerBottle ?? 1,
    })),
  );
}
