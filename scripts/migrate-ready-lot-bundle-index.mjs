/**
 * One-time migration: allow multiple ready lots per batch+product (different bundle sets).
 * Run: node scripts/migrate-ready-lot-bundle-index.mjs
 */
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const col = db.collection("readybottlebatchlots");

  await col.updateMany({ bundleSetId: { $exists: false } }, { $set: { bundleSetId: "" } });
  await col.updateMany({ bundleCode: { $exists: false } }, { $set: { bundleCode: "" } });

  try {
    await col.dropIndex("batchNo_1_productCode_1");
    console.log("Dropped old index batchNo_1_productCode_1");
  } catch (e) {
    console.log("Old index not present or already dropped:", e.message);
  }

  await col.createIndex({ batchNo: 1, productCode: 1, bundleSetId: 1 }, { unique: true });
  console.log("Created index batchNo_1_productCode_1_bundleSetId_1");

  const missingSetId = "bnd-mqz34mdl-fyc3c";
  const existing = await col.findOne({
    batchNo: "260609",
    productCode: "degrease-spray",
    bundleSetId: missingSetId,
  });
  if (!existing) {
    await col.insertOne({
      batchNo: "260609",
      productCode: "degrease-spray",
      productName: "Degrease Spray",
      bottles: 15,
      nimraLinked: true,
      batchProductName: "Degrease Spray",
      note: "Bundle ready stock (Power Wash Dish Wash + Degrease Spray Bundle)",
      bundleCode: "power-wash-dish-degrease-bundle",
      bundleSetId: missingSetId,
      recordedByUserId: "6a27e5ad187905956130e482",
      recordedByName: "Rashid (migration restore)",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log("Restored degrease 260609 lot for bundle set", missingSetId);

    await db.collection("readybottlestocks").updateOne(
      { productCode: "degrease-spray" },
      { $inc: { onHandBottles: 15 } },
    );
    console.log("Added 15 to degrease-spray aggregate");
  } else {
    console.log("Restore lot already exists");
  }

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
