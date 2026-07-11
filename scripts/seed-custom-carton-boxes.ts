import dotenv from "dotenv";
import path from "node:path";

import { CUSTOM_CARTON_SIZE_BOX_OPTIONS } from "@/lib/customCartonBoxes";
import { connectToDatabase } from "@/lib/db";
import { PackagingItem } from "@/lib/models/PackagingItem";

dotenv.config({ path: path.join(process.cwd(), ".env.local"), override: false });
dotenv.config({ path: path.join(process.cwd(), ".env"), override: false });

async function main() {
  await connectToDatabase();

  let n = 0;
  for (const [i, opt] of CUSTOM_CARTON_SIZE_BOX_OPTIONS.entries()) {
    await PackagingItem.updateOne(
      { code: opt.code },
      {
        $set: {
          name: `CUSTOM BOX ${opt.label.toUpperCase()}`,
          category: "box",
          sortOrder: 900 + i,
          unit: "pcs",
          linkedProductCode: "",
          linkedBatchFamily: "",
          deductAs: "box",
          customCartonBox: true,
          active: true,
        },
        $setOnInsert: {
          purchasedQty: 0,
          rejectedDamage: 0,
          uip: 0,
          onHand: 0,
        },
      },
      { upsert: true },
    );
    n += 1;
  }

  console.log(`Seeded ${n} custom outer carton box SKUs (${CUSTOM_CARTON_SIZE_BOX_OPTIONS.map((o) => o.code).join(", ")}).`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
