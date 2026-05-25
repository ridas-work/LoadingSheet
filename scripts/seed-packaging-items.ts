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
  sortOrder?: number;
  unit?: string;
  linkedProductCode?: string;
  linkedBatchFamily?: string;
  deductAs?: string;
};

const VALID_CATEGORIES = new Set([
  "bottle",
  "cap",
  "sticker",
  "label",
  "box",
  "pouch",
  "partition",
  "other",
]);

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
  const codes: string[] = [];
  let n = 0;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]!;
    const code = r.code.trim().toLowerCase();
    const name = r.name.trim();
    const category = r.category.trim().toLowerCase();
    const sortOrder = typeof r.sortOrder === "number" ? r.sortOrder : i + 1;
    if (!code || !name || !VALID_CATEGORIES.has(category)) {
      throw new Error(`Invalid row: ${JSON.stringify(r)}`);
    }
    codes.push(code);

    await PackagingItem.updateOne(
      { code },
      {
        $set: {
          name,
          category,
          sortOrder,
          unit: r.unit?.trim() || "pcs",
          linkedProductCode: r.linkedProductCode?.trim().toLowerCase() ?? "",
          linkedBatchFamily: r.linkedBatchFamily?.trim().toLowerCase() ?? "",
          deductAs: r.deductAs?.trim().toLowerCase() || category,
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

  const deactivated = await PackagingItem.updateMany(
    { code: { $nin: codes } },
    { $set: { active: false } },
  );

  console.log(`Seeded ${n} packaging items. Deactivated ${deactivated.modifiedCount} old catalog rows.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
