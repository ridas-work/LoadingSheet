import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";

import { upsertCustomCartonProduct } from "@/lib/customCartonProductStore";
import { connectToDatabase } from "@/lib/db";

dotenv.config({ path: path.join(process.cwd(), ".env.local"), override: false });
dotenv.config({ path: path.join(process.cwd(), ".env"), override: false });

function loadSeedNames(): string[] {
  const file = path.join(process.cwd(), "data", "custom-carton-products.json");
  const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as unknown;
  if (!Array.isArray(parsed)) throw new Error("custom-carton-products.json must be an array");
  return parsed.filter((n): n is string => typeof n === "string" && n.trim().length > 0);
}

async function main() {
  await connectToDatabase();
  const names = loadSeedNames();
  let upserted = 0;
  for (const name of names) {
    const result = await upsertCustomCartonProduct(name);
    if (!("error" in result)) upserted += 1;
  }
  console.log(`Seeded ${upserted} custom-carton products.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
