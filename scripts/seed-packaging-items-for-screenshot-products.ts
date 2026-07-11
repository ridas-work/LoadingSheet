import dotenv from "dotenv";
import path from "node:path";

import { connectToDatabase } from "@/lib/db";
import { PackagingItem } from "@/lib/models/PackagingItem";
import type { PackagingCategory, PackagingDeductAs } from "@/lib/models/PackagingItem";
import { ProductPacking } from "@/lib/models/ProductPacking";
import { expandBomRequirements } from "@/lib/packagingBom";

dotenv.config({ path: path.join(process.cwd(), ".env.local"), override: false });
dotenv.config({ path: path.join(process.cwd(), ".env"), override: false });

type Case = { productCode: string; fallbackBottlesPerBox?: number };

const CASES: Case[] = [
  { productCode: "rhino-250ml" },
  { productCode: "rhino-500ml" },
  { productCode: "rhino-750ml" },
  { productCode: "brighten-liquid-laundry-detergent" },
  { productCode: "fabrito-fabric-softener" },
  { productCode: "power-wash" },
  { productCode: "degrease-spray" },
  { productCode: "glim", fallbackBottlesPerBox: 10 },
  { productCode: "hand-wash" },
  { productCode: "washout-floral" },
  { productCode: "washout-ocean" },
  { productCode: "washout-lemon" },
  { productCode: "titan-500g" },
  { productCode: "titan-1250g" },
  { productCode: "power-wash-pouch" },
  { productCode: "brighten-laundry-detergent-pouch" },
  { productCode: "fabrito-fabric-softener-pouch" },
  { productCode: "cpl-55ml" },
  { productCode: "cpm-55ml" },
  { productCode: "cpl-210ml" },
  { productCode: "cpm-210ml" },
];

function key(value: string): string {
  return value.trim().toLowerCase();
}

function categoryFromCode(code: string): PackagingCategory {
  const c = key(code);
  if (c.includes("label")) return "label";
  if (c.includes("partition")) return "partition";
  if (c.includes("boxes") || c.includes("box-") || c.includes("-box")) return "box";
  if (c.includes("pouch")) return "pouch";
  if (c.includes("sticker")) return "sticker";
  if (c.includes("lids")) return "cap";
  if (c.includes("caps") || c.includes("cap-") || c.endsWith("-cap")) return "cap";
  if (c.includes("bottle") || c.includes("bottles") || c.includes("jar") || c.includes("spray"))
    return "bottle";
  if (c.includes("string")) return "other";
  return "other";
}

function nameFromCode(code: string): string {
  const c = key(code);

  const saveRs = /^sticker-save-rs-(\d+)$/.exec(c);
  if (saveRs) return `Save Rs. ${saveRs[1]} sticker`;

  const rs = /^sticker-rs-(\d+)$/.exec(c);
  if (rs) return `Rs. ${rs[1]} sticker`;

  if (c === "sticker-25pct-extra") return "25% extra stickers";
  if (c === "glim-stickers") return "GLIM STICKERS";

  // Default: readable uppercase derived from the code.
  return code.replace(/-/g, " ").toUpperCase();
}

async function main() {
  await connectToDatabase();

  const codes = CASES.map((x) => x.productCode);
  const packings = await ProductPacking.find({ active: true, code: { $in: codes } })
    .select({ code: 1, bottlesPerCarton: 1 })
    .lean();

  const bottlesByProduct = new Map<string, number>();
  for (const p of packings) {
    bottlesByProduct.set(p.code, p.bottlesPerCarton);
  }

  const requiredCodes = new Set<string>();
  for (const c of CASES) {
    const bottles = bottlesByProduct.get(c.productCode) ?? c.fallbackBottlesPerBox ?? 0;
    if (!bottles || bottles <= 0) continue;
    const req = expandBomRequirements(c.productCode, bottles, 1);
    for (const rc of req.keys()) requiredCodes.add(key(rc));
  }

  const existing = await PackagingItem.find({
    code: { $in: [...requiredCodes] },
  })
    .select({ code: 1 })
    .lean();
  const existingSet = new Set(existing.map((e) => key(e.code)));

  const toCreate = [...requiredCodes].filter((c) => !existingSet.has(c));

  // eslint-disable-next-line no-console
  console.log(`Need to seed ${toCreate.length} missing packaging item(s) from screenshot BOM.`);

  for (const code of toCreate) {
    const category = categoryFromCode(code);
    const deductAs: PackagingDeductAs =
      category === "other" ? "other" : (category as PackagingDeductAs);
    await PackagingItem.updateOne(
      { code },
      {
        $set: {
          name: nameFromCode(code),
          category,
          deductAs,
          unit: "pcs",
          linkedProductCode: "",
          linkedBatchFamily: "",
          active: true,
          customCartonBox: false,
        },
        $setOnInsert: {
          purchasedQty: 0,
          rejectedDamage: 0,
          uip: 0,
          onHand: 0,
          sortOrder: 999,
        },
      },
      { upsert: true },
    );
  }

  process.exit(0);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

