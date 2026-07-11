import dotenv from "dotenv";
import path from "node:path";

import { connectToDatabase } from "@/lib/db";
import { CustomerAccount } from "@/lib/models/CustomerAccount";
import { setCustomerDirectoryActiveForCode } from "@/lib/customerDirectoryStore";

dotenv.config({ path: path.join(process.cwd(), ".env.local"), override: false });
dotenv.config({ path: path.join(process.cwd(), ".env"), override: false });

async function main() {
  await connectToDatabase();

  const legacy = await CustomerAccount.updateMany(
    { approvalStatus: { $exists: false } },
    { $set: { approvalStatus: "approved", active: true } },
  );
  if (legacy.modifiedCount > 0) {
    console.log(`Marked ${legacy.modifiedCount} legacy account(s) as approved.`);
  }

  const pending = await CustomerAccount.find({ approvalStatus: "pending" }).lean();
  for (const row of pending) {
    const code = (row.directoryCode ?? "").trim().toLowerCase();
    if (code) await setCustomerDirectoryActiveForCode(code, false);
  }
  if (pending.length > 0) {
    console.log(`Deactivated directory for ${pending.length} pending account(s).`);
  }

  const werth = await CustomerAccount.findOne({ companyName: /^werth$/i }).lean();
  if (werth && werth.approvalStatus !== "pending" && werth.approvalStatus !== "blocked") {
    const openedByAccounts = (werth.createdByName ?? "").toLowerCase() === "accounts";
    if (openedByAccounts && !werth.reviewedAt) {
      await CustomerAccount.updateOne(
        { _id: werth._id },
        {
          $set: {
            approvalStatus: "pending",
            active: false,
            reviewedByName: "",
            reviewedAt: null,
          },
        },
      );
      const code = (werth.directoryCode ?? "").trim().toLowerCase();
      if (code) await setCustomerDirectoryActiveForCode(code, false);
      console.log('Reset "werth" to pending approval.');
    }
  }

  await CustomerAccount.db.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
