import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { Order } from "@/lib/models/Order";

type CreateOrderBody = {
  poNumber?: unknown;
  customerName?: unknown;
  productName?: unknown;
  bottles?: unknown;
};

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id as string | undefined;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as CreateOrderBody | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const errors: Record<string, string> = {};

  if (!isNonEmptyString(body.poNumber)) errors.poNumber = "PO number is required.";
  if (!isNonEmptyString(body.customerName)) errors.customerName = "Customer name is required.";
  if (!isNonEmptyString(body.productName)) errors.productName = "Product name is required.";

  const bottlesNumber = typeof body.bottles === "number" ? body.bottles : Number(body.bottles);
  if (!Number.isInteger(bottlesNumber) || bottlesNumber < 1) {
    errors.bottles = "Bottles must be an integer ≥ 1.";
  }

  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ errors }, { status: 400 });
  }

  await connectToDatabase();

  const created = await Order.create({
    poNumber: String(body.poNumber).trim(),
    customerName: String(body.customerName).trim(),
    productName: String(body.productName).trim(),
    bottles: bottlesNumber,
    createdByUserId: userId,
    createdByName: session.user.name ?? "",
  });

  return NextResponse.json({ id: created._id.toString() }, { status: 200 });
}

