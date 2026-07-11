import dotenv from "dotenv";
import path from "node:path";

import { connectToDatabase } from "@/lib/db";
import { PackagingItem } from "@/lib/models/PackagingItem";
import type { PackagingCategory, PackagingDeductAs } from "@/lib/models/PackagingItem";
import { ProductPacking } from "@/lib/models/ProductPacking";

dotenv.config({ path: path.join(process.cwd(), ".env.local"), override: false });
dotenv.config({ path: path.join(process.cwd(), ".env"), override: false });

type ItemDef = {
  code: string;
  name: string;
  category: PackagingCategory;
  deductAs: PackagingDeductAs;
  linkedProductCode?: string;
  linkedBatchFamily?: string;
  sortOrder: number;
};

const SHARED_55ML: ItemDef[] = [
  {
    code: "cpl-cpm-55ml-bottle",
    name: "CPL/CPM 55 ML BOTTLE",
    category: "bottle",
    deductAs: "bottle",
    linkedBatchFamily: "CPL",
    sortOrder: 900,
  },
  {
    code: "cpl-cpm-55ml-cap",
    name: "CPL/CPM 55 ML CAP",
    category: "cap",
    deductAs: "cap",
    sortOrder: 901,
  },
  {
    code: "cpl-cpm-55ml-small-box",
    name: "CPL/CPM 55 ML SMALL BOX (12 bottles)",
    category: "box",
    deductAs: "box",
    sortOrder: 902,
  },
  {
    code: "cpl-cpm-55ml-big-box",
    name: "CPL/CPM 55 ML BIG BOX (72 bottles)",
    category: "box",
    deductAs: "box",
    sortOrder: 903,
  },
];

const SHARED_210ML: ItemDef[] = [
  {
    code: "cpl-cpm-210ml-bottle",
    name: "CPL/CPM 210 ML BOTTLE",
    category: "bottle",
    deductAs: "bottle",
    linkedBatchFamily: "CPL",
    sortOrder: 910,
  },
  {
    code: "cpl-cpm-210ml-pump",
    name: "CPL/CPM 210 ML PUMP",
    category: "cap",
    deductAs: "cap",
    sortOrder: 911,
  },
  {
    code: "cpl-cpm-210ml-box",
    name: "CPL/CPM 210 ML BOX (12 bottles)",
    category: "box",
    deductAs: "box",
    sortOrder: 912,
  },
];

const LABELS: ItemDef[] = [
  {
    code: "cpl-55ml-label-front",
    name: "CPL 55 ML LABEL FRONT",
    category: "label",
    deductAs: "label",
    linkedProductCode: "cpl-55ml",
    sortOrder: 920,
  },
  {
    code: "cpl-55ml-label-back",
    name: "CPL 55 ML LABEL BACK",
    category: "label",
    deductAs: "label",
    linkedProductCode: "cpl-55ml",
    sortOrder: 921,
  },
  {
    code: "cpm-55ml-label-front",
    name: "CPM 55 ML LABEL FRONT",
    category: "label",
    deductAs: "label",
    linkedProductCode: "cpm-55ml",
    sortOrder: 922,
  },
  {
    code: "cpm-55ml-label-back",
    name: "CPM 55 ML LABEL BACK",
    category: "label",
    deductAs: "label",
    linkedProductCode: "cpm-55ml",
    sortOrder: 923,
  },
  {
    code: "cpl-210ml-label-front",
    name: "CPL 210 ML LABEL FRONT",
    category: "label",
    deductAs: "label",
    linkedProductCode: "cpl-210ml",
    sortOrder: 924,
  },
  {
    code: "cpl-210ml-label-back",
    name: "CPL 210 ML LABEL BACK",
    category: "label",
    deductAs: "label",
    linkedProductCode: "cpl-210ml",
    sortOrder: 925,
  },
  {
    code: "cpm-210ml-label-front",
    name: "CPM 210 ML LABEL FRONT",
    category: "label",
    deductAs: "label",
    linkedProductCode: "cpm-210ml",
    sortOrder: 926,
  },
  {
    code: "cpm-210ml-label-back",
    name: "CPM 210 ML LABEL BACK",
    category: "label",
    deductAs: "label",
    linkedProductCode: "cpm-210ml",
    sortOrder: 927,
  },
];

const PRODUCT_PACKINGS = [
  {
    code: "cpl-55ml",
    name: "Colgate Palmolive Lemon (CPL) 55ml",
    summaryLabel: "CPL 55",
    batchFamily: "CPL",
    bottlesPerCarton: 72,
    litersPerBottle: 0.055,
    aliases: ["CPL 55 ml", "CPL 55ml", "Colgate palmolive Lemon CPL 55ml"],
  },
  {
    code: "cpm-55ml",
    name: "Colgate Palmolive Mint (CPM) 55ml",
    summaryLabel: "CPM 55",
    batchFamily: "CPM",
    bottlesPerCarton: 72,
    litersPerBottle: 0.055,
    aliases: ["CPM 55 ml", "CPM 55ml", "Colgate Palmolive Mint CPM 55ml"],
  },
  {
    code: "cpl-210ml",
    name: "Colgate Palmolive Lemon (CPL) 210ml",
    summaryLabel: "CPL 210",
    batchFamily: "CPL",
    bottlesPerCarton: 12,
    litersPerBottle: 0.21,
    aliases: ["CPL 210 ml", "CPL 210ml", "Colgate palmolive Lemon CPL 210ml"],
  },
  {
    code: "cpm-210ml",
    name: "Colgate Palmolive Mint (CPM) 210ml",
    summaryLabel: "CPM 210",
    batchFamily: "CPM",
    bottlesPerCarton: 12,
    litersPerBottle: 0.21,
    aliases: ["CPM 210 ml", "CPM 210ml", "Colgate Palmolive Mint CPM 210ml"],
  },
];

const ALL_ITEMS = [...SHARED_55ML, ...SHARED_210ML, ...LABELS];

async function main() {
  await connectToDatabase();

  for (const p of PRODUCT_PACKINGS) {
    await ProductPacking.updateOne(
      { code: p.code },
      {
        $set: {
          name: p.name,
          summaryLabel: p.summaryLabel,
          batchFamily: p.batchFamily,
          bottlesPerCarton: p.bottlesPerCarton,
          litersPerBottle: p.litersPerBottle,
          aliases: p.aliases,
          active: true,
        },
      },
      { upsert: true },
    );
  }

  for (const item of ALL_ITEMS) {
    await PackagingItem.updateOne(
      { code: item.code },
      {
        $set: {
          name: item.name,
          category: item.category,
          deductAs: item.deductAs,
          unit: "pcs",
          linkedProductCode: item.linkedProductCode ?? "",
          linkedBatchFamily: item.linkedBatchFamily ?? "",
          active: true,
          customCartonBox: false,
          sortOrder: item.sortOrder,
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
  }

  // eslint-disable-next-line no-console
  console.log(`Seeded ${ALL_ITEMS.length} CPL/CPM packaging item(s) and ${PRODUCT_PACKINGS.length} product packing(s).`);
  process.exit(0);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
