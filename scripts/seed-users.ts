import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import path from "node:path";

// Ensure env is loaded before importing DB/model modules.
dotenv.config({ path: path.join(process.cwd(), ".env.local"), override: false });
dotenv.config({ path: path.join(process.cwd(), ".env"), override: false });

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
    if (!Array.isArray(parsed) || parsed.length < 1) {
      throw new Error("SEED_USERS_JSON must be a non-empty JSON array");
    }
    return parsed;
  }

  return [
    { name: "Nouman", username: "nouman", password: "Nouman-Order-01", role: "po_creator" },
    { name: "Javeria", username: "javeria", password: "Javeria-Order-02", role: "po_creator" },
    { name: "Aslam", username: "aslam", password: "Aslam-Order-03", role: "po_creator" },
    { name: "Ibtisam", username: "ibtisam", password: "Ibtisam-Order-04", role: "po_creator" },
    { name: "Nimra", username: "nimra", password: "Nimra-Batch-01", role: "batch_editor" },
  ];
}

async function main() {
  const { connectToDatabase } = await import("@/lib/db");
  const { User } = await import("@/lib/models/User");

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
  console.log(`Seeded/updated ${upserted} user(s). See README for credentials.`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

