import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import path from "node:path";

import { connectToDatabase } from "@/lib/db";
import { User } from "@/lib/models/User";
import { isAppRole, type AppRole } from "@/lib/roles";

dotenv.config({ path: path.join(process.cwd(), ".env.local"), override: false });
dotenv.config({ path: path.join(process.cwd(), ".env"), override: false });

type SeedUser = {
  name: string;
  username: string;
  password: string;
  role: AppRole;
  active?: boolean;
};

const DEFAULT_USERS: SeedUser[] = [
  { name: "Nouman", username: "nouman", password: "Nouman-Order-01", role: "po_creator" },
  { name: "Javeria", username: "javeria", password: "Javeria-Order-02", role: "po_creator" },
  { name: "Aslam", username: "aslam", password: "Aslam-Order-03", role: "po_creator" },
  { name: "Ibtisam", username: "ibtisam", password: "Ibtisam-Order-04", role: "po_creator" },
  { name: "Ahtisham", username: "ahtisham", password: "Ahtisham-Order-04", role: "po_creator" },
  { name: "Esha", username: "esha", password: "Nimra-Batch-01", role: "batch_editor" },
  { name: "Ali", username: "ali", password: "Ali-Dispatch-01", role: "dispatch_editor" },
  { name: "Rashid", username: "rashid", password: "Rashid-Dispatch-01", role: "dispatch_editor" },
  { name: "Ramazan", username: "ramazan", password: "Ramazan-Chemicals-01", role: "chemicals_editor" },
  { name: "Zaman", username: "zaman", password: "Zaman-Guard-01", role: "gate_guard" },
  { name: "Accounts", username: "accounts", password: "Accounts-Open-01", role: "account_opener" },
  { name: "Waleed Intisar", username: "waleed", password: "Waleed-Admin-01", role: "admin" },
];

function loadUsers(): SeedUser[] {
  const raw = process.env.SEED_USERS_JSON;
  if (!raw) return DEFAULT_USERS;

  const parsed = JSON.parse(raw) as SeedUser[];
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("SEED_USERS_JSON must be a non-empty JSON array.");
  }
  return parsed;
}

function normalizeUser(user: SeedUser): SeedUser {
  const username = user.username.trim().toLowerCase();
  const name = user.name.trim();
  const password = user.password;
  if (!name) throw new Error(`User ${username || "(missing username)"} is missing name.`);
  if (!username) throw new Error(`User ${name} is missing username.`);
  if (!password || password.length < 8) {
    throw new Error(`User ${username} must have a password at least 8 characters long.`);
  }
  if (!isAppRole(user.role)) {
    throw new Error(`User ${username} has invalid role "${user.role}".`);
  }
  return { ...user, name, username, password, active: user.active ?? true };
}

async function main() {
  await connectToDatabase();

  const users = loadUsers().map(normalizeUser);
  for (const user of users) {
    const passwordHash = await bcrypt.hash(user.password, 12);
    await User.updateOne(
      { username: user.username },
      {
        $set: {
          name: user.name,
          username: user.username,
          passwordHash,
          role: user.role,
          active: user.active ?? true,
        },
      },
      { upsert: true },
    );
    console.log(`Seeded ${user.username} (${user.role})`);
  }

  const retired = await User.deleteOne({ username: "haider" });
  if (retired.deletedCount > 0) {
    console.log("Deleted retired user: haider (packaging merged into Esha)");
  }

  console.log(`Seeded ${users.length} users.`);
  await User.db.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
