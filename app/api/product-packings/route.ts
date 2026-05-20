import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { ProductPacking } from "@/lib/models/ProductPacking";
import { parseProductPackingCreateBody } from "@/lib/productPackingValidation";
import { roleFromSession } from "@/lib/roles";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (roleFromSession(session.user as { role?: string }) !== "batch_editor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as unknown;
  const parsed = parseProductPackingCreateBody(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const v = parsed.value;

  await connectToDatabase();

  const existing = await ProductPacking.findOne({ code: v.code }).lean();
  if (existing) {
    return NextResponse.json({ error: "A product with this code already exists" }, { status: 409 });
  }

  try {
    const doc = await ProductPacking.create({
      code: v.code,
      name: v.name,
      bottlesPerCarton: v.bottlesPerCarton,
      litersPerBottle: v.litersPerBottle,
      batchFamily: v.batchFamily,
      summaryLabel: v.summaryLabel,
      active: true,
      aliases: [],
      bundleComponents: [],
    });
    return NextResponse.json(
      {
        product: {
          code: doc.code,
          name: doc.name,
          bottlesPerCarton: doc.bottlesPerCarton,
          litersPerBottle: doc.litersPerBottle,
          batchFamily: doc.batchFamily,
        },
      },
      { status: 201 },
    );
  } catch (err: unknown) {
    const code = typeof err === "object" && err !== null && "code" in err ? (err as { code?: number }).code : undefined;
    if (code === 11000) {
      return NextResponse.json({ error: "A product with this code already exists" }, { status: 409 });
    }
    throw err;
  }
}
