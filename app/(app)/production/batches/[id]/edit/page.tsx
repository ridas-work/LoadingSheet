import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import mongoose from "mongoose";

import { ProductionBatchForm } from "@/components/ProductionBatchForm";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { ProductionBatch } from "@/lib/models/ProductionBatch";
import { loadBatchUsageContext, usageForBatchNo } from "@/lib/productionBatchStatus";
import { roleFromSession } from "@/lib/roles";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditProductionBatchPage(props: PageProps) {
  const { id } = await props.params;
  if (!mongoose.Types.ObjectId.isValid(id)) notFound();

  const session = await auth();
  const role = roleFromSession(session?.user as { role?: string });
  if (role !== "batch_editor") {
    redirect("/production/batches");
  }

  await connectToDatabase();
  const batch = await ProductionBatch.findById(id).lean();
  if (!batch) notFound();

  const { usedMap } = await loadBatchUsageContext();
  const usage = usageForBatchNo(batch.batchNo, batch.totalLiters, usedMap);
  if (usage.locked) {
    redirect(`/production/batches/${id}`);
  }

  const preparedAt = batch.preparedAt
    ? new Date(batch.preparedAt).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <Link href={`/production/batches/${id}`} className="text-sm font-medium text-zinc-700 underline">
          ← Back to batch detail
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">Edit batch</h1>
        <p className="mt-1 text-sm text-zinc-600">{batch.batchNo}</p>
      </div>
      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <ProductionBatchForm
          batchId={id}
          initialBatchNo={batch.batchNo}
          initialProductName={batch.productName}
          initialTotalLiters={batch.totalLiters}
          initialPreparedAt={preparedAt}
          initialPh={batch.ph ?? ""}
          initialSolids={batch.solids ?? ""}
          initialAppearance={batch.appearance ?? ""}
          initialProvider={batch.provider ?? ""}
          initialDrum={batch.drum ?? ""}
          initialQuantity={batch.quantity ?? ""}
        />
      </div>
    </div>
  );
}
