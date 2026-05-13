import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";

import { connectToDatabase } from "@/lib/db";
import { ProductPacking } from "@/lib/models/ProductPacking";

dotenv.config({ path: path.join(process.cwd(), ".env.local"), override: false });
dotenv.config({ path: path.join(process.cwd(), ".env"), override: false });

type SeedRow = { code: string; name: string; bottlesPerCarton: number; litersPerBottle?: number; aliases?: string[] };

function inferLitersPerBottle(name: string, explicit?: number): number {
  if (typeof explicit === "number" && explicit > 0) return explicit;
  const ml = name.match(/(\d+(?:\.\d+)?)\s*ml/i);
  if (ml) return Number(ml[1]) / 1000;
  const litre = name.match(/(\d+(?:\.\d+)?)\s*l(?:itre|iter)?s?\b/i);
  if (litre) return Number(litre[1]);
  return 1;
}

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
    const litersPerBottle = inferLitersPerBottle(name, r.litersPerBottle);
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
          active: true,
          aliases: Array.isArray(r.aliases) ? r.aliases : [],
        },
      },
      { upsert: true },
    );
    n += 1;
  }
  // eslint-disable-next-line no-console
  console.log(`Upserted ${n} product packing(s).`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
