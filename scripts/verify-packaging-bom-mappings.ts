import dotenv from "dotenv";
import path from "node:path";

import { connectToDatabase } from "@/lib/db";
import { PackagingItem } from "@/lib/models/PackagingItem";
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

async function main() {
  await connectToDatabase();

  const codes = CASES.map((c) => c.productCode);
  const packings = await ProductPacking.find({ active: true, code: { $in: codes } })
    .select({ code: 1, bottlesPerCarton: 1 })
    .lean();

  const bottlesByProduct = new Map<string, number>();
  for (const p of packings) {
    bottlesByProduct.set(p.code, p.bottlesPerCarton);
  }

  const missingByProduct: Record<string, string[]> = {};

  for (const c of CASES) {
    const bottles = bottlesByProduct.get(c.productCode) ?? c.fallbackBottlesPerBox ?? 0;
    if (!bottles || bottles <= 0) {
      missingByProduct[c.productCode] = [`No bottlesPerBox found for product (and no fallback)`];
      continue;
    }
    const req = expandBomRequirements(c.productCode, bottles, 1);
    const requiredCodes = [...req.keys()];

    const have = await PackagingItem.find({ code: { $in: requiredCodes }, active: true })
      .select({ code: 1 })
      .lean();
    const haveSet = new Set(have.map((h) => h.code));
    const missing = requiredCodes.filter((rc) => !haveSet.has(rc));

    if (missing.length > 0) missingByProduct[c.productCode] = missing;
  }

  // eslint-disable-next-line no-console
  console.log(JSON.stringify(missingByProduct, null, 2));
  process.exit(0);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

