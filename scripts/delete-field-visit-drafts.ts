import dotenv from "dotenv";
import path from "node:path";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

/** Empty Nouman drafts shown as "New visit (draft)" — safe to remove. */
const DELETE_IDS = ["6a390aad1a3d353c0668f9ab", "6a34e64e646279f8739a5281"];

async function main() {
  const { connectToDatabase } = await import("@/lib/db");
  const { FieldVisitTicket } = await import("@/lib/models/FieldVisitTicket");
  await connectToDatabase();

  for (const id of DELETE_IDS) {
    const t = await FieldVisitTicket.findById(id);
    if (!t) {
      console.log("Not found:", id);
      continue;
    }
    console.log(
      "Deleting",
      id,
      "-",
      t.placeName?.trim() || t.customerName?.trim() || "(empty draft)",
      "- logs:",
      t.visitLogs?.length ?? 0,
    );
    await FieldVisitTicket.deleteOne({ _id: id });
  }
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
