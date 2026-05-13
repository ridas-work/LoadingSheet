import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { Order } from "@/lib/models/Order";
import { roleFromSession } from "@/lib/roles";

type BatchUpdate = { boxNo?: unknown; batchNo?: unknown };

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (roleFromSession(session.user as { role?: string }) !== "batch_editor") {
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

  const body = (await req.json().catch(() => null)) as { batches?: unknown } | null;
  if (!body || !Array.isArray(body.batches)) {
    return NextResponse.json({ error: "batches array is required" }, { status: 400 });
  }

  const updates = new Map<number, string>();
  for (const raw of body.batches as BatchUpdate[]) {
    const boxNo = typeof raw.boxNo === "number" ? raw.boxNo : Number(raw.boxNo);
    if (!Number.isInteger(boxNo) || boxNo < 1) {
      return NextResponse.json({ error: "Each batch entry needs a valid boxNo" }, { status: 400 });
    }
    const batchNo = typeof raw.batchNo === "string" ? raw.batchNo.trim() : "";
    updates.set(boxNo, batchNo);
  }

  await connectToDatabase();

  const order = await Order.findById(id);
  if (!order) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const lines = order.sheetLines ?? [];
  const knownBoxNos = new Set(lines.map((l) => l.boxNo));

  for (const boxNo of updates.keys()) {
    if (!knownBoxNos.has(boxNo)) {
      return NextResponse.json({ error: `Unknown box number: ${boxNo}` }, { status: 400 });
    }
  }

  for (const line of lines) {
    if (updates.has(line.boxNo)) {
      line.batchNo = updates.get(line.boxNo) ?? "";
    }
  }

  order.sheetLines = lines;
  order.batchUpdatedByUserId = userId;
  order.batchUpdatedByName = session.user.name ?? "";
  order.batchUpdatedAt = new Date();
  await order.save();

  return NextResponse.json({ ok: true });
}
