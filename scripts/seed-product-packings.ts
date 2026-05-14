import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";

import { inferLitersPerBottleFromName } from "@/lib/batchVolume";
import { connectToDatabase } from "@/lib/db";
import { ProductPacking } from "@/lib/models/ProductPacking";

dotenv.config({ path: path.join(process.cwd(), ".env.local"), override: false });
dotenv.config({ path: path.join(process.cwd(), ".env"), override: false });

type SeedRow = {
  code: string;
  name: string;
  bottlesPerCarton: number;
  litersPerBottle?: number;
  aliases?: string[];
  batchFamily?: string;
  summaryLabel?: string;
  bundleComponents?: Array<{ code: string; bottlesPerUnit: number }>;
};

function loadSeedRows(): SeedRow[] {
  const raw = process.env.SEED_PRODUCTS_JSON;
  if (raw) {
    const parsed = JSON.parse(raw) as SeedRow[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error("SEED_PRODUCTS_JSON must be a non-empty JSON array");
    }
    return parsed;
  }

  const filePath = path.join(process.cwd(), "data", "product-packings.json");
  const json = fs.readFileSync(filePath, "utf8");
  const parsed = JSON.parse(json) as SeedRow[];
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("data/product-packings.json must be a non-empty array");
  }
  return parsed;
}

async function main() {
  await connectToDatabase();
  const rows = loadSeedRows();
  let n = 0;
  for (const r of rows) {
    const code = r.code.trim().toLowerCase();
    const name = r.name.trim();
    const bottlesPerCarton = r.bottlesPerCarton;
    const litersPerBottle = inferLitersPerBottleFromName(name, r.litersPerBottle);
    const hasBundle = Array.isArray(r.bundleComponents) && r.bundleComponents.length > 0;
    const batchFamily = hasBundle
      ? ""
      : typeof r.batchFamily === "string" && r.batchFamily.trim()
        ? r.batchFamily.trim()
        : name;
    const summaryLabel =
      typeof r.summaryLabel === "string" && r.summaryLabel.trim()
        ? r.summaryLabel.trim()
        : name.length > 24
          ? name.slice(0, 22) + "…"
          : name;
    if (!code || !name || !Number.isInteger(bottlesPerCarton) || bottlesPerCarton < 1) {
      throw new Error(`Invalid row: ${JSON.stringify(r)}`);
    }
    await ProductPacking.updateOne(
      { code },
      {
        $set: {
          name,
          bottlesPerCarton,
          litersPerBottle,
          batchFamily,
          summaryLabel,
          bundleComponents: hasBundle
            ? r.bundleComponents!.map((c) => ({
                code: c.code.trim().toLowerCase(),
                bottlesPerUnit: c.bottlesPerUnit,
              }))
            : [],
          active: true,
          aliases: Array.isArray(r.aliases) ? r.aliases : [],
        },
      },
      { upsert: true },
    );
    n += 1;
  }

  await ProductPacking.updateOne({ code: "washouts" }, { $set: { active: false } });

  // eslint-disable-next-line no-console
  console.log(`Upserted ${n} product packing(s).`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
