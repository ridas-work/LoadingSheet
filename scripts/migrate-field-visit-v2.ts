import dotenv from "dotenv";
import path from "node:path";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const { connectToDatabase } = await import("@/lib/db");
  const { FieldVisitTicket } = await import("@/lib/models/FieldVisitTicket");
  await connectToDatabase();

  const legacy = await FieldVisitTicket.find({
    status: { $in: ["sample_requested", "sample_delivered"] },
  });

  console.log(`Found ${legacy.length} legacy ticket(s) to migrate${dryRun ? " (dry run)" : ""}.`);

  for (const ticket of legacy) {
    const oldStatus = ticket.status;
    const hasProducts = (ticket.sampleProducts?.length ?? 0) > 0;
    const sampleMode: "none" | "outgoing" | "incoming" =
      oldStatus === "sample_requested" || oldStatus === "sample_delivered"
        ? hasProducts
          ? "outgoing"
          : "none"
        : "none";

    const visitLogs = [...(ticket.visitLogs ?? [])];
    if (oldStatus === "sample_delivered" && visitLogs.length === 0) {
      const visitDate = ticket.sampleDeliveredAt ?? ticket.updatedAt ?? new Date();
      const conclusion =
        [ticket.feedbackComments, ticket.followUpComments].filter(Boolean).join(" — ").trim() ||
        "Sample delivered (migrated from legacy ticket).";
      visitLogs.push({
        visitDate: new Date(visitDate),
        conclusion,
        recordedAt: new Date(visitDate),
        recordedByName: ticket.createdByName ?? "",
      } as (typeof visitLogs)[number]);
    }

    const patch = {
      status: "active" as const,
      sampleMode,
      visitLogs,
    };

    console.log(`  ${ticket._id} ${oldStatus} → active (${sampleMode}, ${visitLogs.length} visit log(s))`);

    if (!dryRun) {
      ticket.status = patch.status;
      ticket.sampleMode = patch.sampleMode;
      ticket.set("visitLogs", patch.visitLogs);
      await ticket.save();
    }
  }

  console.log(dryRun ? "Dry run complete — no changes written." : "Migration complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
