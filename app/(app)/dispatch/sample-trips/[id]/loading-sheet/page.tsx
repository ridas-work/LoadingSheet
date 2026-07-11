import { notFound, redirect } from "next/navigation";
import mongoose from "mongoose";

import {
  CombinedTripLoadingSheet,
  type CombinedTripLine,
  type CombinedTripOrder,
} from "@/components/CombinedTripLoadingSheet";
import { auth } from "@/lib/auth";
import type { SheetLine } from "@/lib/buildSheetLines";
import { connectToDatabase } from "@/lib/db";
import { formatDisplayDate } from "@/lib/dateOnly";
import { DispatchTrip } from "@/lib/models/DispatchTrip";
import { Order } from "@/lib/models/Order";
import { homePathForRole, roleFromSession } from "@/lib/roles";

type PageProps = { params: Promise<{ id: string }> };

function normalizeSheetLines(sheetLines: SheetLine[] | undefined): CombinedTripLine[] {
  return (sheetLines ?? []).map((row) => {
    const extended = row as SheetLine & {
      lineKind?: string;
      mixedContents?: Array<{ productName: string; bottles: number }>;
      componentBatches?: Array<{ productName: string; batchNo?: string | null }>;
      cartonWeightKg?: number | null;
    };
    return {
      boxNo: row.boxNo,
      productName: row.productName,
      bottlesPerBox: row.bottlesPerBox,
      lineKind: extended.lineKind,
      mixedContents: extended.mixedContents,
      batchNo: row.batchNo ?? "",
      componentBatches: extended.componentBatches?.map((c) => ({
        productName: c.productName,
        batchNo: c.batchNo ?? "",
      })),
      cartonWeightKg: extended.cartonWeightKg ?? null,
    };
  });
}

function formatDate(value: unknown): string {
  if (!value) return "";
  return formatDisplayDate(value as string | Date);
}

export default async function SampleTripLoadingSheetPage({ params }: PageProps) {
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) notFound();

  const session = await auth();
  const role = roleFromSession(session?.user as { role?: string });
  const username = (session?.user as { username?: string })?.username;
  if (role && role !== "dispatch_editor" && role !== "admin") {
    redirect(homePathForRole(role, username));
  }

  await connectToDatabase();
  const trip = await DispatchTrip.findById(id).lean();
  if (!trip) notFound();

  const orderIds = (trip.orderIds ?? []).map((oid) => oid.toString());
  const orderDocs =
    orderIds.length > 0
      ? await Order.find({ _id: { $in: orderIds } })
          .select({ poNumber: 1, customerName: 1, sheetLines: 1, "dispatch.dcNo": 1 })
          .lean()
      : [];
  const orderById = new Map(orderDocs.map((o) => [o._id.toString(), o]));
  const tripChallanByOrderId = new Map(
    ((trip as { orderChallans?: Array<{ orderId: { toString(): string }; dcNo?: string }> }).orderChallans ?? [])
      .map((row) => [row.orderId.toString(), row.dcNo?.trim() ?? ""]),
  );

  const orders: CombinedTripOrder[] = orderIds
    .map((orderId) => {
      const order = orderById.get(orderId);
      if (!order) return null;
      const dispatchDc = (order as { dispatch?: { dcNo?: string } }).dispatch?.dcNo?.trim() ?? "";
      return {
        id: orderId,
        poNumber: order.poNumber,
        customerName: order.customerName,
        challanNo: tripChallanByOrderId.get(orderId) || dispatchDc || trip.dcNo || "",
        lines: normalizeSheetLines(order.sheetLines as SheetLine[]),
      };
    })
    .filter((order): order is CombinedTripOrder => Boolean(order));

  return (
    <CombinedTripLoadingSheet
      tripId={id}
      vehicleNo={trip.vehicleNo ?? ""}
      driverName={trip.driverName ?? ""}
      helperName={trip.helperName ?? ""}
      productionIncharge={trip.productionIncharge ?? ""}
      securityName={trip.securityName ?? ""}
      driverSignature={trip.driverSignature ?? ""}
      tripDate={formatDate(trip.dispatchedAt ?? trip.createdAt)}
      orders={orders}
    />
  );
}
