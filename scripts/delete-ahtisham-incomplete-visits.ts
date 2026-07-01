import dotenv from "dotenv";
import path from "node:path";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

async function main() {
  const { connectToDatabase } = await import("@/lib/db");
  const { FieldVisitTicket } = await import("@/lib/models/FieldVisitTicket");
  await connectToDatabase();

  const tickets = await FieldVisitTicket.find({
    createdByUsername: "ahtisham",
    status: "active",
    $or: [{ placeName: "" }, { placeName: null }],
    $and: [{ $or: [{ customerName: "" }, { customerName: null }] }],
  })
    .sort({ updatedAt: -1 })
    .lean();

  const withOneVisit = tickets.filter((t) => (t.visitLogs?.length ?? 0) === 1);
  const toDelete = withOneVisit.slice(0, 2);

  if (toDelete.length === 0) {
    console.log("No matching visits to delete.");
    return;
  }

  for (const t of toDelete) {
    console.log(
      "Deleting",
      t._id.toString(),
      "- logs:",
      t.visitLogs?.length ?? 0,
      "- updated:",
      t.updatedAt,
    );
    await FieldVisitTicket.deleteOne({ _id: t._id });
  }
  console.log("Done. Deleted", toDelete.length, "visit(s).");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
