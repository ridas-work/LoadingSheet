import Link from "next/link";
import { redirect } from "next/navigation";

import type { FillingRow } from "@/components/BatchFillingGrid";
import { BatchFillingGrid } from "@/components/BatchFillingGrid";
import { DatePickerForm } from "@/components/DatePickerForm";
import { auth } from "@/lib/auth";
import { todayIsoDate } from "@/lib/batchFillingWaste";
import { roundLiters } from "@/lib/batchVolume";
import { connectToDatabase } from "@/lib/db";
import { BatchFillingDailyEntry } from "@/lib/models/BatchFillingDailyEntry";
import { ProductionBatch } from "@/lib/models/ProductionBatch";
import { canEditDispatch, isAdmin, roleFromSession } from "@/lib/roles";
import { loadBatchUsageContext, usageForBatchNo } from "@/lib/productionBatchStatus";

type PageProps = {
  searchParams: Promise<{ date?: string }>;
};

export default async function BatchFillingPage({ searchParams }: PageProps) {
  const session = await auth();
  const role = roleFromSession(session?.user as { role?: string });

  if (!canEditDispatch(role) && !isAdmin(role)) {
    redirect("/login");
  }

  const readOnly = isAdmin(role);
  const { date: dateParam } = await searchParams;
  const date = dateParam?.match(/^\d{4}-\d{2}-\d{2}$/) ? dateParam : todayIsoDate();

  await connectToDatabase();

  const [batches, { usedMap }, entries] = await Promise.all([
    ProductionBatch.find({}).sort({ preparedAt: -1 }).lean(),
    loadBatchUsageContext(),
    BatchFillingDailyEntry.find({ entryDate: date }).lean(),
  ]);

  const entryByBatch = new Map(entries.map((e) => [e.batchNo.toLowerCase(), e]));

  const rows: FillingRow[] = batches
    .map((b) => {
      const usage = usageForBatchNo(b.batchNo, b.totalLiters, usedMap);
      if (usage.status === "empty" && !entryByBatch.has(b.batchNo.toLowerCase())) return null;
      const entry = entryByBatch.get(b.batchNo.toLowerCase());
      const row: FillingRow = {
        batchNo: b.batchNo,
        productName: b.productName,
        totalLiters: b.totalLiters,
        usedLiters: roundLiters(usage.usedLiters),
        systemRemainingLiters: roundLiters(usage.remainingLiters),
        status: usage.status,
        entry: entry
          ? {
              filledLitersToday: entry.filledLitersToday,
              readyToDeliverLiters: entry.readyToDeliverLiters,
              physicalRemainingLiters: entry.physicalRemainingLiters,
              systemRemainingLiters: entry.systemRemainingLiters,
              wasteLiters: entry.wasteLiters,
              note: entry.note ?? "",
            }
          : null,
      };
      return row;
    })
    .filter((r): r is FillingRow => r !== null && r !== undefined);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/dispatch/trips" className="text-sm font-medium text-zinc-700 underline">
            ← Dispatch trips
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-zinc-900">Daily filling log</h1>
          <p className="mt-1 text-sm text-zinc-600">
            {readOnly
              ? "View filling records and waste for each batch (read-only)."
              : "Record how much you filled today, what is ready to deliver, and how much liquid remains in each batch."}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            <strong>Variance</strong> = Nimra&apos;s system remaining − your physical count.
            Positive (red) = possible waste or unlogged use. Negative (amber) = Rashid measured more than system.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-zinc-600">
          <span className="font-medium">Date:</span>
          <DatePickerForm value={date} max={todayIsoDate()} />
        </div>
      </div>

      <BatchFillingGrid date={date} initialRows={rows} readOnly={readOnly} />
    </div>
  );
}
