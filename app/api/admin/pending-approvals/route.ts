import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { pendingFieldVisitSampleMongoFilter } from "@/lib/fieldVisitTickets";
import { FieldVisitTicket } from "@/lib/models/FieldVisitTicket";
import { Order } from "@/lib/models/Order";
import { pendingApprovalMongoFilter } from "@/lib/orderApproval";
import { isAdmin, roleFromSession } from "@/lib/roles";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = roleFromSession(session.user as { role?: string });
  if (!isAdmin(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectToDatabase();
  const [pendingPoCount, pendingFieldSampleCount] = await Promise.all([
    Order.countDocuments(pendingApprovalMongoFilter()),
    FieldVisitTicket.countDocuments(pendingFieldVisitSampleMongoFilter()),
  ]);

  return NextResponse.json({
    pendingPoCount,
    pendingFieldSampleCount,
    pendingCount: pendingPoCount + pendingFieldSampleCount,
  });
}
