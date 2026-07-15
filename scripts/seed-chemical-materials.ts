/**
 * Seed ChemicalRawMaterial from data/chemical-raw-materials.json
 * Usage: npx tsx scripts/seed-chemical-materials.ts
 */
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";

import { connectToDatabase } from "@/lib/db";
import { ChemicalRawMaterial } from "@/lib/models/ChemicalRawMaterial";

dotenv.config({ path: path.join(process.cwd(), ".env.local"), override: false });
dotenv.config({ path: path.join(process.cwd(), ".env"), override: false });

type SeedRow = {
  code: string;
  name: string;
  unit?: string;
  sortOrder?: number;
  kind?: "chemical" | "accessory";
};

function loadRows(): SeedRow[] {
  const filePath = path.join(process.cwd(), "data", "chemical-raw-materials.json");
  const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as SeedRow[];
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("data/chemical-raw-materials.json must be a non-empty array");
  }
  return parsed;
}

async function main() {
  await connectToDatabase();
  const rows = loadRows();
  let n = 0;

  for (const r of rows) {
    const code = r.code.trim().toLowerCase();
    const name = r.name.trim();
    if (!code || !name) throw new Error(`Invalid chemical row: ${JSON.stringify(r)}`);

    await ChemicalRawMaterial.updateOne(
      { code },
      {
        $set: {
          name,
          kind: r.kind === "accessory" ? "accessory" : "chemical",
          unit: r.unit?.trim() || "kg",
          sortOrder: typeof r.sortOrder === "number" ? r.sortOrder : n + 1,
          active: true,
        },
        $setOnInsert: { onHand: 0 },
      },
      { upsert: true },
    );
    n += 1;
  }

  console.log(`Seeded ${n} chemical raw material(s).`);
  await ChemicalRawMaterial.db.close();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
