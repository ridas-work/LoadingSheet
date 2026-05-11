import bcrypt from "bcryptjs";
import "dotenv/config";

import { connectToDatabase } from "@/lib/db";
import { User } from "@/lib/models/User";

type SeedUser = {
  name: string;
  username: string;
  password: string;
  role?: string;
};

function getSeedUsers(): SeedUser[] {
  const raw = process.env.SEED_USERS_JSON;
  if (raw) {
    const parsed = JSON.parse(raw) as SeedUser[];
    if (!Array.isArray(parsed) || parsed.length !== 4) {
      throw new Error("SEED_USERS_JSON must be a JSON array with exactly 4 users");
    }
    return parsed;
  }

  return [
    { name: "PO User 1", username: "po1", password: "change-me-1", role: "po_creator" },
    { name: "PO User 2", username: "po2", password: "change-me-2", role: "po_creator" },
    { name: "PO User 3", username: "po3", password: "change-me-3", role: "po_creator" },
    { name: "PO User 4", username: "po4", password: "change-me-4", role: "po_creator" },
  ];
}

async function main() {
  await connectToDatabase();

  const seedUsers = getSeedUsers().map((u) => ({
    ...u,
    username: u.username.toLowerCase().trim(),
  }));

  let upserted = 0;

  for (const u of seedUsers) {
    const passwordHash = await bcrypt.hash(u.password, 12);

    const res = await User.updateOne(
      { username: u.username },
      {
        $set: {
          name: u.name,
          username: u.username,
          passwordHash,
          role: u.role ?? "po_creator",
          active: true,
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { upsert: true },
    );

    if (res.upsertedCount > 0 || res.modifiedCount > 0) upserted += 1;
  }

  // eslint-disable-next-line no-console
  console.log(`Seeded/updated ${upserted} user(s).`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

