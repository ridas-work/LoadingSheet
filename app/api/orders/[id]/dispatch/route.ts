import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { Order } from "@/lib/models/Order";
import { roleFromSession } from "@/lib/roles";

function trimField(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (roleFromSession(session.user as { role?: string }) !== "dispatch_editor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const userId = (session.user as { id?: string }).id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid order id" }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const driverName = trimField(body.driverName);
  const driverSignature = trimField(body.driverSignature) || driverName;

  await connectToDatabase();

  const order = await Order.findById(id);
  if (!order) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  order.set("dispatch", {
    vehicleNo: trimField(body.vehicleNo),
    driverName,
    dcNo: trimField(body.dcNo),
    helperName: trimField(body.helperName),
    productionIncharge: trimField(body.productionIncharge),
    securityName: trimField(body.securityName),
    driverSignature,
  });
  order.dispatchUpdatedByUserId = userId;
  order.dispatchUpdatedByName = session.user.name ?? "";
  order.dispatchUpdatedAt = new Date();
  await order.save();

  return NextResponse.json({ ok: true });
}
