import dotenv from "dotenv";
import path from "node:path";

import { connectToDatabase } from "@/lib/db";
import { ProductPacking } from "@/lib/models/ProductPacking";

dotenv.config({ path: path.join(process.cwd(), ".env.local"), override: false });
dotenv.config({ path: path.join(process.cwd(), ".env"), override: false });

async function main() {
  await connectToDatabase();
  const n = await ProductPacking.countDocuments({ active: true });
  const all = await ProductPacking.find({ active: true }).sort({ name: 1 }).select("code name bottlesPerCarton").lean();
  // eslint-disable-next-line no-console
  console.log(`Active ProductPacking documents: ${n}`);
  // eslint-disable-next-line no-console
  all.forEach((d) => console.log(`  - ${d.name} | ${d.bottlesPerCarton}/carton | ${d.code}`));
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
