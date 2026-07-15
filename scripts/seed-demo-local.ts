/**
 * Local demo operational data: batches, ready lots, large POs, and a trip.
 * Usage: npx tsx scripts/seed-demo-local.ts
 *
 * Safe to re-run: clears previous LOCAL-DEMO-* records first.
 */
import dotenv from "dotenv";
import path from "node:path";

import { connectToDatabase } from "@/lib/db";
import { DispatchTrip } from "@/lib/models/DispatchTrip";
import { Order } from "@/lib/models/Order";
import { ProductPacking } from "@/lib/models/ProductPacking";
import { ProductionBatch } from "@/lib/models/ProductionBatch";
import { ReadyBottleBatchLot } from "@/lib/models/ReadyBottleBatchLot";
import { ReadyBottleStock } from "@/lib/models/ReadyBottleStock";
import { User } from "@/lib/models/User";

dotenv.config({ path: path.join(process.cwd(), ".env.local"), override: false });
dotenv.config({ path: path.join(process.cwd(), ".env"), override: false });

const DEMO_PREFIX = "LOCAL-DEMO";
const BATCHES_PER_FAMILY = 12;
const READY_LOTS_PER_PRODUCT = 8;

type Packing = {
  code: string;
  name: string;
  bottlesPerCarton: number;
  litersPerBottle?: number | null;
  batchFamily?: string | null;
  bundleComponents?: Array<{ code: string; bottlesPerUnit: number }> | null;
};

function familyOf(p: Packing): string {
  return (p.batchFamily?.trim() || p.name.trim());
}

function sheetLinesForProduct(p: Packing, startBox: number, cartons: number) {
  const lines = [];
  for (let i = 0; i < cartons; i++) {
    lines.push({
      boxNo: startBox + i,
      productName: p.name,
      bottlesPerBox: p.bottlesPerCarton,
      lineKind: "standard" as const,
      mixedContents: [],
      batchNo: "",
      componentBatches: [],
      weight: null,
      cartonWeightKg: null,
      customBoxCode: "",
    });
  }
  return lines;
}

async function main() {
  await connectToDatabase();

  const packings = (await ProductPacking.find({
    active: true,
    $or: [{ bundleComponents: { $exists: false } }, { bundleComponents: { $size: 0 } }],
  })
    .select({ code: 1, name: 1, bottlesPerCarton: 1, litersPerBottle: 1, batchFamily: 1, bundleComponents: 1 })
    .lean()) as Packing[];

  if (packings.length === 0) {
    throw new Error("No product packings found. Run seed-product-packings first.");
  }

  const rashid = await User.findOne({ username: "rashid" }).lean();
  const nouman = await User.findOne({ username: "nouman" }).lean();

  // Clear previous demo rows
  await Order.deleteMany({ poNumber: { $regex: `^${DEMO_PREFIX}` } });
  await DispatchTrip.deleteMany({ vehicleNo: { $regex: `^${DEMO_PREFIX}` } });
  await ProductionBatch.deleteMany({ batchNo: { $regex: `^${DEMO_PREFIX}` } });
  await ReadyBottleBatchLot.deleteMany({ batchNo: { $regex: `^${DEMO_PREFIX}` } });

  const families = [...new Set(packings.map(familyOf))];
  let batchCount = 0;
  const batchesByFamily = new Map<string, string[]>();

  for (const family of families) {
    const nums: string[] = [];
    for (let i = 1; i <= BATCHES_PER_FAMILY; i++) {
      const batchNo = `${DEMO_PREFIX}-B${String(batchCount + 1).padStart(4, "0")}`;
      await ProductionBatch.create({
        batchNo,
        batchKind: "standard",
        productionPurpose: "regular",
        productName: family,
        totalLiters: 800 + (i % 5) * 100,
        preparedAt: new Date(),
        ph: "7.2",
        solids: "18",
        appearance: "OK",
        provider: "Local demo",
        qcOutcome: "approved",
        createdByName: "Esha",
      });
      nums.push(batchNo);
      batchCount += 1;
    }
    batchesByFamily.set(family, nums);
  }

  let lotCount = 0;
  for (const p of packings) {
    const family = familyOf(p);
    const familyBatches = batchesByFamily.get(family) ?? [];
    const useBatches = familyBatches.slice(0, READY_LOTS_PER_PRODUCT);
    let bottlesTotal = 0;
    for (let i = 0; i < useBatches.length; i++) {
      const batchNo = useBatches[i]!;
      const bottles = 120 + i * 40;
      bottlesTotal += bottles;
      await ReadyBottleBatchLot.updateOne(
        { batchNo, productCode: p.code, bundleSetId: "" },
        {
          $set: {
            productName: p.name,
            bottles,
            nimraLinked: true,
            batchProductName: family,
            note: "local demo",
            recordedByName: "Rashid",
          },
        },
        { upsert: true },
      );
      lotCount += 1;
    }
    await ReadyBottleStock.updateOne(
      { productCode: p.code },
      {
        $set: {
          productName: p.name,
          onHandBottles: bottlesTotal,
          updatedByName: "Rashid",
        },
      },
      { upsert: true },
    );
  }

  // Build 3 large POs covering many products / cartons for trip lag testing
  const orderIds: import("mongoose").Types.ObjectId[] = [];
  const productsForOrders = packings.filter((p) => !p.code.includes("bundle")).slice(0, 18);

  for (let oi = 1; oi <= 3; oi++) {
    const items = [];
    const sheetLines = [];
    let boxNo = 1;
    for (const p of productsForOrders) {
      const cartons = oi === 1 ? 6 : oi === 2 ? 4 : 3;
      items.push({
        productName: p.name,
        boxes: cartons,
        bottlesPerBox: p.bottlesPerCarton,
      });
      sheetLines.push(...sheetLinesForProduct(p, boxNo, cartons));
      boxNo += cartons;
    }

    const order = await Order.create({
      poNumber: `${DEMO_PREFIX}-PO-${oi}`,
      customerName: `Local Demo Customer ${oi}`,
      city: "Lahore",
      deadlineDate: new Date(Date.now() + oi * 86400000 * 3),
      orderKind: "standard",
      items,
      sheetLines,
      createdByUserId: nouman?._id?.toString() ?? null,
      createdByName: nouman?.name ?? "Nouman",
      approvalStatus: "approved",
      approvedAt: new Date(),
      gateDeliveryStatus: "none",
      dispatch: {
        vehicleNo: "",
        driverName: "",
        dcNo: "",
        helperName: "",
        productionIncharge: "",
        securityName: "",
        driverSignature: "",
      },
    });
    orderIds.push(order._id);
  }

  const trip = await DispatchTrip.create({
    tripKind: "regular",
    vehicleNo: `${DEMO_PREFIX}-VEH-01`,
    driverName: "Demo Driver",
    dcNo: `${DEMO_PREFIX}-DC-01`,
    helperName: "Demo Helper",
    productionIncharge: "Demo PIC",
    securityName: "",
    driverSignature: "",
    orderIds,
    orderChallans: orderIds.map((id, i) => ({
      orderId: id,
      dcNo: `${DEMO_PREFIX}-CH-${i + 1}`,
    })),
    createdByUserId: rashid?._id?.toString() ?? null,
    createdByName: rashid?.name ?? "Rashid",
  });

  await Order.updateMany(
    { _id: { $in: orderIds } },
    {
      $set: {
        dispatchTripId: trip._id,
        "dispatch.vehicleNo": trip.vehicleNo,
        "dispatch.driverName": trip.driverName,
        "dispatch.dcNo": trip.dcNo,
        "dispatch.helperName": trip.helperName,
        "dispatch.productionIncharge": trip.productionIncharge,
      },
    },
  );

  console.log(
    JSON.stringify(
      {
        families: families.length,
        productionBatches: batchCount,
        readyLots: lotCount,
        orders: orderIds.length,
        sheetLinesApprox: productsForOrders.length * (6 + 4 + 3),
        tripId: trip._id.toString(),
        tripUrl: `/dispatch/trips/${trip._id.toString()}/loading-sheet?dispatch=1`,
      },
      null,
      2,
    ),
  );

  await Order.db.close();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
