import dotenv from "dotenv";
import path from "node:path";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

const ID = "6a2d2ec16e941e8c9079d67f";

async function main() {
  const { connectToDatabase } = await import("@/lib/db");
  const { FieldVisitTicket } = await import("@/lib/models/FieldVisitTicket");
  await connectToDatabase();

  const t = await FieldVisitTicket.findById(ID);
  if (!t) {
    const byName = await FieldVisitTicket.findOne({
      placeName: /Zafar Fabric/i,
      customerName: /Farhan/i,
    });
    if (!byName) {
      console.log("Not found");
      return;
    }
    console.log("Deleting", byName._id.toString(), byName.placeName, byName.customerName);
    await FieldVisitTicket.deleteOne({ _id: byName._id });
    console.log("Done.");
    return;
  }

  console.log("Deleting", t._id.toString(), t.placeName, t.customerName, t.status);
  await FieldVisitTicket.deleteOne({ _id: t._id });
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
