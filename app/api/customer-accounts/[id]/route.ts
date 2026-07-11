import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { serializeCustomerAccount } from "@/lib/customerAccount";
import { setCustomerDirectoryActiveForCode } from "@/lib/customerDirectoryStore";
import { connectToDatabase } from "@/lib/db";
import { CustomerAccount } from "@/lib/models/CustomerAccount";
import { isAdmin, roleFromSession } from "@/lib/roles";

type RouteCtx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: RouteCtx) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = roleFromSession(session.user as { role?: string });
  if (!isAdmin(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as { action?: string } | null;
  const action = typeof body?.action === "string" ? body.action.trim() : "";

  if (!["approve", "block"].includes(action)) {
    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  }

  await connectToDatabase();
  const doc = await CustomerAccount.findById(id);
  if (!doc) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }

  const reviewer = session.user.name ?? "Admin";
  const now = new Date();
  const directoryCode = (doc.directoryCode ?? "").trim().toLowerCase();

  if (action === "approve") {
    if (doc.approvalStatus === "approved") {
      return NextResponse.json({ error: "Account is already approved." }, { status: 400 });
    }
    doc.approvalStatus = "approved";
    doc.active = true;
    doc.reviewedByName = reviewer;
    doc.reviewedAt = now;
    await doc.save();
    if (directoryCode) {
      await setCustomerDirectoryActiveForCode(directoryCode, true);
    }
  } else {
    doc.approvalStatus = "blocked";
    doc.active = false;
    doc.reviewedByName = reviewer;
    doc.reviewedAt = now;
    await doc.save();
    if (directoryCode) {
      await setCustomerDirectoryActiveForCode(directoryCode, false);
    }
  }

  return NextResponse.json({ account: serializeCustomerAccount(doc) });
}
