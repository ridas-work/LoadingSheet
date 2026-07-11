import dotenv from "dotenv";
import path from "node:path";

import { connectToDatabase } from "@/lib/db";
import { PackagingItem } from "@/lib/models/PackagingItem";

dotenv.config({ path: path.join(process.cwd(), ".env.local"), override: false });
dotenv.config({ path: path.join(process.cwd(), ".env"), override: false });

async function main() {
  await connectToDatabase();

  await PackagingItem.updateOne(
    { code: "glim-stickers" },
    {
      $set: {
        name: "GLIM STICKERS",
        category: "sticker",
        deductAs: "sticker",
        unit: "pcs",
        linkedProductCode: "glim",
        linkedBatchFamily: "",
        active: true,
        customCartonBox: false,
      },
      $setOnInsert: {
        purchasedQty: 0,
        rejectedDamage: 0,
        uip: 0,
        onHand: 0,
        sortOrder: 520,
      },
    },
    { upsert: true },
  );

  process.exit(0);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

