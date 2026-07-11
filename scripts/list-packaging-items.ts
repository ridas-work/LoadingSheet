import dotenv from "dotenv";
import path from "node:path";

import { connectToDatabase } from "@/lib/db";
import { PackagingItem } from "@/lib/models/PackagingItem";

async function main() {
  dotenv.config({ path: path.join(process.cwd(), ".env.local"), override: false });
  dotenv.config({ path: path.join(process.cwd(), ".env"), override: false });
  await connectToDatabase();

  const patterns = [
    "rhino-stickers",
    "brighten-stickers",
    "fabrito",
    "degreaser-stickers",
    "glim",
    "power-wash-stickers",
    "wash-out-label",
    "ph-stickers",
    "rhino-boxes",
    "rhino-lids",
  ];

  const results: Record<string, unknown[]> = {};

  for (const p of patterns) {
    const rows = await PackagingItem.find({
      code: { $regex: p, $options: "i" },
      active: true,
    })
      .select({
        code: 1,
        name: 1,
        category: 1,
        deductAs: 1,
        linkedProductCode: 1,
        linkedBatchFamily: 1,
        purchasedQty: 1,
        rejectedDamage: 1,
        uip: 1,
        onHand: 1,
      })
      .lean();
    results[p] = rows;
  }

  // eslint-disable-next-line no-console
  console.log(JSON.stringify(results, null, 2));
  process.exit(0);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

