import dotenv from "dotenv";
import path from "node:path";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

async function main() {
  const { connectToDatabase } = await import("@/lib/db");
  await connectToDatabase();
  const mongoose = await import("mongoose");
  const db = mongoose.default.connection.db;
  if (!db) {
    console.log("No db connection");
    return;
  }
  console.log("Active database name:", db.databaseName);
  const cols = await db.listCollections().toArray();
  const counts: { name: string; count: number }[] = [];
  for (const c of cols.sort((a, b) => a.name.localeCompare(b.name))) {
    const count = await db.collection(c.name).countDocuments();
    counts.push({ name: c.name, count });
  }
  for (const row of counts) {
    if (row.count > 0) console.log(`${row.name}: ${row.count}`);
  }
  console.log("--- empty collections ---");
  for (const row of counts) {
    if (row.count === 0) console.log(row.name);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
