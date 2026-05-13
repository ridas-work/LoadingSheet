import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import {
  assertOrdersAvailableForTrip,
  parseOrderIds,
  syncTripDispatchToOrders,
  trimDispatchBody,
} from "@/lib/dispatchTripSync";
import { connectToDatabase } from "@/lib/db";
import { DispatchTrip } from "@/lib/models/DispatchTrip";
import { Order } from "@/lib/models/Order";
import { roleFromSession } from "@/lib/roles";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();
  const trips = await DispatchTrip.find({}).sort({ updatedAt: -1 }).lean();

  const allOrderIds = trips.flatMap((t) => t.orderIds ?? []);
  const orders =
    allOrderIds.length > 0
      ? await Order.find({ _id: { $in: allOrderIds } })
          .select({ poNumber: 1 })
          .lean()
      : [];
  const poById = new Map(orders.map((o) => [o._id.toString(), o.poNumber]));

  return NextResponse.json(
    trips.map((t) => {
      const id = t._id.toString();
      const orderIdStrings = (t.orderIds ?? []).map((oid) => oid.toString());
      return {
        id,
        vehicleNo: t.vehicleNo ?? "",
        driverName: t.driverName ?? "",
        dcNo: t.dcNo ?? "",
        orderIds: orderIdStrings,
        poNumbers: orderIdStrings.map((oid) => poById.get(oid) ?? oid),
        orderCount: orderIdStrings.length,
        updatedAt: t.updatedAt,
        dispatchedAt: t.dispatchedAt,
      };
    }),
  );
}

export async function POST(req: Request) {
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

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const orderIds = parseOrderIds(body.orderIds);
  await connectToDatabase();

  const conflict = await assertOrdersAvailableForTrip(orderIds);
  if (conflict) {
    return NextResponse.json({ error: conflict }, { status: 400 });
  }

  const fields = trimDispatchBody(body);
  const trip = await DispatchTrip.create({
    ...fields,
    orderIds,
    dispatchedAt: new Date(),
    createdByUserId: userId,
    createdByName: session.user.name ?? "",
  });

  await syncTripDispatchToOrders(trip, { userId, userName: session.user.name ?? "" });

  return NextResponse.json({ id: trip._id.toString() }, { status: 201 });
}
