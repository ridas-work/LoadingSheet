import { NextResponse } from "next/server";

import {
  buildBatchBottlesReport,
  buildCustomerOrdersReport,
  buildOverviewReport,
  buildProductDispersionReport,
  buildProductTotalsReport,
  distinctCustomerNames,
  filterOrders,
  type ReportCatalogRow,
  type ReportOptions,
  type ReportOrderInput,
  type ReportScope,
} from "@/lib/adminOperationsReports";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { BatchFillingDailyEntry } from "@/lib/models/BatchFillingDailyEntry";
import { Order } from "@/lib/models/Order";
import { ProductPacking } from "@/lib/models/ProductPacking";
import { ProductionBatch } from "@/lib/models/ProductionBatch";
import { canViewAdminReports, canViewAdminSummary, roleFromSession } from "@/lib/roles";

const VIEWS = ["overview", "products", "customers", "dispersion", "batches"] as const;
type ReportView = (typeof VIEWS)[number];

function parseScope(raw: string | null): ReportScope | null {
  if (!raw) return "all";
  if (raw === "all" || raw === "delivered" || raw === "pipeline") return raw;
  return null;
}

function parseView(raw: string | null): ReportView | null {
  if (!raw) return null;
  return VIEWS.includes(raw as ReportView) ? (raw as ReportView) : null;
}

function parseIsoDateParam(raw: string | null): string | null {
  if (!raw?.trim()) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(raw.trim()) ? raw.trim() : null;
}

function mapOrders(orders: Array<Record<string, unknown>>): ReportOrderInput[] {
  return orders.map((o) => {
    const doc = o as {
      _id: { toString(): string };
      poNumber: string;
      customerName: string;
      createdAt?: Date | string | null;
      gateDeliveryStatus?: string | null;
      gateDeliveredAt?: Date | string | null;
      dispatchTripId?: unknown;
      dispatch?: { vehicleNo?: string | null; dcNo?: string | null } | null;
      discardedAt?: Date | string | null;
      orderKind?: string | null;
      items?: ReportOrderInput["items"];
      sheetLines?: ReportOrderInput["sheetLines"];
      mixedSample?: ReportOrderInput["mixedSample"];
      customCartons?: ReportOrderInput["customCartons"];
    };

    return {
      orderId: doc._id.toString(),
      poNumber: doc.poNumber,
      customerName: doc.customerName,
      createdAt: doc.createdAt,
      gateDeliveryStatus: doc.gateDeliveryStatus,
      gateDeliveredAt: doc.gateDeliveredAt,
      dispatchTripId: doc.dispatchTripId,
      dispatch: doc.dispatch,
      discardedAt: doc.discardedAt,
      orderKind: doc.orderKind,
      items: doc.items,
      sheetLines: doc.sheetLines,
      mixedSample: doc.mixedSample,
      customCartons: doc.customCartons,
    };
  });
}

function mapCatalog(docs: Array<Record<string, unknown>>): ReportCatalogRow[] {
  return docs.map((p) => {
    const doc = p as {
      code: string;
      name: string;
      aliases?: string[];
      summaryLabel?: string;
      litersPerBottle?: number | null;
      bottlesPerCarton?: number | null;
      batchFamily?: string | null;
    };
    return {
      code: doc.code,
      name: doc.name,
      aliases: doc.aliases ?? [],
      summaryLabel: doc.summaryLabel ?? "",
      litersPerBottle: doc.litersPerBottle ?? undefined,
      bottlesPerCarton: doc.bottlesPerCarton ?? undefined,
      batchFamily: doc.batchFamily ?? undefined,
    };
  });
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = roleFromSession(session.user as { role?: string });
  const username = (session?.user as { username?: string })?.username;
  if (!canViewAdminSummary(role, username)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!canViewAdminReports(role, username)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const view = parseView(url.searchParams.get("view"));
  if (!view) {
    return NextResponse.json({ error: "Missing or invalid view parameter" }, { status: 400 });
  }

  const scope = parseScope(url.searchParams.get("scope"));
  if (!scope) {
    return NextResponse.json({ error: "Invalid scope parameter" }, { status: 400 });
  }

  const dateFrom = parseIsoDateParam(url.searchParams.get("dateFrom"));
  const dateTo = parseIsoDateParam(url.searchParams.get("dateTo"));
  if (url.searchParams.get("dateFrom") && !dateFrom) {
    return NextResponse.json({ error: "Invalid dateFrom (use YYYY-MM-DD)" }, { status: 400 });
  }
  if (url.searchParams.get("dateTo") && !dateTo) {
    return NextResponse.json({ error: "Invalid dateTo (use YYYY-MM-DD)" }, { status: 400 });
  }

  const customer = url.searchParams.get("customer")?.trim() ?? "";
  const productCode = url.searchParams.get("productCode")?.trim() ?? "";
  const batch = url.searchParams.get("batch")?.trim() ?? "";

  if (view === "dispersion" && !productCode) {
    return NextResponse.json({ error: "productCode is required for dispersion view" }, { status: 400 });
  }

  const options: ReportOptions = { scope, dateFrom, dateTo };

  await connectToDatabase();

  const orderSelect = {
    poNumber: 1,
    customerName: 1,
    createdAt: 1,
    gateDeliveryStatus: 1,
    gateDeliveredAt: 1,
    dispatchTripId: 1,
    dispatch: 1,
    discardedAt: 1,
    items: 1,
    sheetLines: 1,
    orderKind: 1,
    mixedSample: 1,
    customCartons: 1,
  };

  const [orders, catalogDocs] = await Promise.all([
    Order.find({}).select(orderSelect).lean(),
    ProductPacking.find({ active: true })
      .sort({ name: 1 })
      .select({
        code: 1,
        name: 1,
        aliases: 1,
        batchFamily: 1,
        summaryLabel: 1,
        litersPerBottle: 1,
        bottlesPerCarton: 1,
      })
      .lean(),
  ]);

  const ordersMapped = mapOrders(orders as Array<Record<string, unknown>>);
  const catalog = mapCatalog(catalogDocs as Array<Record<string, unknown>>);

  switch (view) {
    case "overview":
      return NextResponse.json(buildOverviewReport(ordersMapped, catalog, options));

    case "products":
      return NextResponse.json(buildProductTotalsReport(ordersMapped, catalog, options));

    case "customers": {
      if (!customer) {
        const scoped = filterOrders(ordersMapped, options);
        return NextResponse.json({
          customerQuery: "",
          orders: [],
          productTotals: [],
          customerNames: distinctCustomerNames(scoped).slice(0, 500),
          grandTotals: {
            orderCount: 0,
            customerCount: 0,
            totalCartons: 0,
            totalBottles: 0,
          },
        });
      }
      return NextResponse.json(
        buildCustomerOrdersReport(ordersMapped, catalog, customer, options, productCode || undefined),
      );
    }

    case "dispersion":
      return NextResponse.json(
        buildProductDispersionReport(ordersMapped, catalog, productCode, options),
      );

    case "batches": {
      const [productionBatches, fillingEntries] = await Promise.all([
        ProductionBatch.find({})
          .select({ batchNo: 1, productName: 1, totalLiters: 1 })
          .sort({ preparedAt: -1 })
          .lean(),
        BatchFillingDailyEntry.find({})
          .select({ batchNo: 1, entryDate: 1, packingLines: 1 })
          .lean(),
      ]);

      const batchInputs = productionBatches.map((b) => ({
        batchId: b._id.toString(),
        batchNo: b.batchNo,
        productName: b.productName,
        totalLiters: b.totalLiters,
      }));

      const fillingMapped = fillingEntries.map((e) => ({
        batchNo: e.batchNo,
        entryDate: e.entryDate,
        packingLines: (e.packingLines ?? []).map((line) => ({
          productCode: line.productCode,
          productName: line.productName,
          filledBottlesToday: line.filledBottlesToday ?? 0,
        })),
      }));

      return NextResponse.json(
        buildBatchBottlesReport(
          batchInputs,
          fillingMapped,
          ordersMapped,
          catalog,
          options,
          batch,
          productCode || undefined,
        ),
      );
    }

    default:
      return NextResponse.json({ error: "Unknown view" }, { status: 400 });
  }
}
