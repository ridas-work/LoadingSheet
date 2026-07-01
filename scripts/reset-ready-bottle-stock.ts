import "dotenv/config";

import mongoose from "mongoose";

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Missing MONGODB_URI");

  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  if (!db) throw new Error("No database connection");

  const collections = ["readybottlestocks", "readybottlebatchlots", "readybottlemovements"] as const;
  for (const name of collections) {
    const result = await db.collection(name).deleteMany({});
    console.log(`${name}: deleted ${result.deletedCount}`);
  }

  await mongoose.disconnect();
  console.log("Ready bottle stock cleared.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
