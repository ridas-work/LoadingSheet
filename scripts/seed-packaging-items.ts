import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";

import { connectToDatabase } from "@/lib/db";
import { PackagingItem } from "@/lib/models/PackagingItem";

dotenv.config({ path: path.join(process.cwd(), ".env.local"), override: false });
dotenv.config({ path: path.join(process.cwd(), ".env"), override: false });

type SeedRow = {
  code: string;
  name: string;
  category: string;
  unit?: string;
  linkedProductCode?: string;
};

const VALID_CATEGORIES = new Set(["bottle", "cap", "sticker", "label", "other"]);

function loadSeedRows(): SeedRow[] {
  const raw = process.env.SEED_PACKAGING_JSON;
  if (raw) {
    const parsed = JSON.parse(raw) as SeedRow[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error("SEED_PACKAGING_JSON must be a non-empty JSON array");
    }
    return parsed;
  }

  const filePath = path.join(process.cwd(), "data", "packaging-items.json");
  const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as SeedRow[];
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("data/packaging-items.json must be a non-empty array");
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
    const category = r.category.trim().toLowerCase();
    if (!code || !name || !VALID_CATEGORIES.has(category)) {
      throw new Error(`Invalid row: ${JSON.stringify(r)}`);
    }

    await PackagingItem.updateOne(
      { code },
      {
        $set: {
          name,
          category,
          unit: r.unit?.trim() || "pcs",
          linkedProductCode: r.linkedProductCode?.trim().toLowerCase() ?? "",
          active: true,
        },
        $setOnInsert: { onHand: 0 },
      },
      { upsert: true },
    );
    n += 1;
  }

  console.log(`Seeded ${n} packaging items.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
