import dotenv from "dotenv";
import path from "node:path";

import { connectToDatabase } from "@/lib/db";
import { PackagingItem } from "@/lib/models/PackagingItem";

dotenv.config({ path: path.join(process.cwd(), ".env.local"), override: false });
dotenv.config({ path: path.join(process.cwd(), ".env"), override: false });

const FRONT_BACK_LABELS = [
  { code: "wash-out-label-floral-front", name: "Washout Floral front label", family: "Washout Floral Red" },
  { code: "wash-out-label-floral-back", name: "Washout Floral back label", family: "Washout Floral Red" },
  { code: "wash-out-label-ocean-front", name: "Washout Ocean front label", family: "Washout Ocean Blue" },
  { code: "wash-out-label-ocean-back", name: "Washout Ocean back label", family: "Washout Ocean Blue" },
  { code: "wash-out-label-lemon-front", name: "Washout Lemon front label", family: "Washout Lemon Yellow" },
  { code: "wash-out-label-lemon-back", name: "Washout Lemon back label", family: "Washout Lemon Yellow" },
] as const;

const LEGACY_LABELS = [
  "wash-out-label-floral",
  "wash-out-label-ocean",
  "wash-out-label-lemon",
] as const;

async function main() {
  await connectToDatabase();

  for (const row of FRONT_BACK_LABELS) {
    await PackagingItem.updateOne(
      { code: row.code },
      {
        $set: {
          name: row.name,
          category: "label",
          deductAs: "label",
          unit: "pcs",
          linkedBatchFamily: row.family.toLowerCase(),
          linkedProductCode: "",
          active: true,
          customCartonBox: false,
        },
        $setOnInsert: {
          purchasedQty: 0,
          rejectedDamage: 0,
          uip: 0,
          onHand: 0,
          sortOrder: 500,
        },
      },
      { upsert: true },
    );
    console.log(`Upserted ${row.code}`);
  }

  // Keep partition naming aligned with BOM.
  await PackagingItem.updateOne(
    { code: "wash-out-partition-big" },
    {
      $set: {
        name: "Washout large partition",
        category: "partition",
        deductAs: "partition",
        unit: "pcs",
        linkedBatchFamily: "washout",
        active: true,
      },
      $setOnInsert: {
        purchasedQty: 0,
        rejectedDamage: 0,
        uip: 0,
        onHand: 0,
        sortOrder: 510,
        linkedProductCode: "",
        customCartonBox: false,
      },
    },
    { upsert: true },
  );
  console.log("Upserted wash-out-partition-big");

  // Deactivate legacy single labels if present so the catalog stays clean.
  const deactivated = await PackagingItem.updateMany(
    { code: { $in: [...LEGACY_LABELS] } },
    { $set: { active: false } },
  );
  console.log(`Deactivated ${deactivated.modifiedCount} legacy Washout label row(s).`);

  // If an old code wash-out-big-partition exists, deactivate it (BOM uses wash-out-partition-big).
  const oldPart = await PackagingItem.updateMany(
    { code: "wash-out-big-partition" },
    { $set: { active: false } },
  );
  console.log(`Deactivated ${oldPart.modifiedCount} legacy Washout partition row(s).`);

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
