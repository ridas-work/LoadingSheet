import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { parseCustomerAccountBody, serializeCustomerAccount } from "@/lib/customerAccount";
import {
  ensureCustomerDirectoryForAccount,
  setCustomerDirectoryActiveForCode,
} from "@/lib/customerDirectoryStore";
import { connectToDatabase } from "@/lib/db";
import { CustomerAccount } from "@/lib/models/CustomerAccount";
import { canOpenCustomerAccounts, isAdmin, roleFromSession } from "@/lib/roles";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = roleFromSession(session.user as { role?: string });
  if (!canOpenCustomerAccounts(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectToDatabase();

  const userId = (session.user as { id?: string })?.id ?? null;
  const filter = isAdmin(role) ? {} : { createdByUserId: userId };

  const rows = await CustomerAccount.find(filter).sort({ createdAt: -1 }).limit(500).lean();
  return NextResponse.json({ accounts: rows.map((r) => serializeCustomerAccount(r)) });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = roleFromSession(session.user as { role?: string });
  if (!canOpenCustomerAccounts(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = parseCustomerAccountBody(raw);
  if (!parsed.ok) {
    return NextResponse.json({ error: "Validation failed.", fields: parsed.errors }, { status: 400 });
  }

  await connectToDatabase();

  const actorId = (session.user as { id?: string })?.id ?? undefined;
  const actorName = (session.user as { name?: string })?.name ?? "";

  const directory = await ensureCustomerDirectoryForAccount(parsed.value.companyName, {
    userId: actorId,
    name: actorName,
  });
  if ("error" in directory) {
    return NextResponse.json({ error: directory.error }, { status: 400 });
  }

  const approvalStatus = isAdmin(role) ? "approved" : "pending";

  const doc = await CustomerAccount.create({
    ...parsed.value,
    directoryCode: directory.code,
    createdByUserId: actorId ?? null,
    createdByName: actorName,
    active: false,
    approvalStatus: "pending",
    reviewedByName: "",
    reviewedAt: null,
  });

  if (isAdmin(role)) {
    doc.approvalStatus = "approved";
    doc.active = true;
    doc.reviewedByName = actorName;
    doc.reviewedAt = new Date();
    await doc.save();
    await setCustomerDirectoryActiveForCode(directory.code, true);
  } else {
    await setCustomerDirectoryActiveForCode(directory.code, false);
    // Belt-and-suspenders: ensure pending status is persisted even if a stale model was cached.
    await CustomerAccount.updateOne(
      { _id: doc._id },
      {
        $set: {
          approvalStatus: "pending",
          active: false,
          reviewedByName: "",
          reviewedAt: null,
        },
      },
    );
  }

  const saved = await CustomerAccount.findById(doc._id).lean();
  const account = serializeCustomerAccount(saved ?? doc);

  return NextResponse.json(
    {
      account,
      message:
        approvalStatus === "pending"
          ? "Account saved. Waiting for admin approval before this customer can be used on orders."
          : undefined,
    },
    { status: 201 },
  );
}
