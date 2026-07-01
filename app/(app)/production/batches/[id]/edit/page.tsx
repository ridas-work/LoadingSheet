import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import mongoose from "mongoose";

import { ProductionBatchForm } from "@/components/ProductionBatchForm";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { ProductionBatch } from "@/lib/models/ProductionBatch";
import { inferNimraBatchKind } from "@/lib/nimraBatchProductLists";
import { normalizeQcOutcome } from "@/lib/productionBatchQc";
import { isBatchClosed } from "@/lib/productionBatchClose";
import { loadBatchUsageContext, usageForBatchNo } from "@/lib/productionBatchStatus";
import { canEditProductionBatches, roleFromSession } from "@/lib/roles";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditProductionBatchPage(props: PageProps) {
  const { id } = await props.params;
  if (!mongoose.Types.ObjectId.isValid(id)) notFound();

  const session = await auth();
  const role = roleFromSession(session?.user as { role?: string });
  if (!canEditProductionBatches(role)) {
    redirect("/production/batches");
  }

  await connectToDatabase();
  const batch = await ProductionBatch.findById(id).lean();
  if (!batch) notFound();

  const { usedMap, catalog } = await loadBatchUsageContext();
  const usage = usageForBatchNo(batch.batchNo, batch.totalLiters, usedMap, batch.productName, catalog);
  const lockedForCorrection = usage.locked;
  if (normalizeQcOutcome(batch.qcOutcome) === "discarded") {
    redirect(`/production/batches/${id}`);
  }
  if (isBatchClosed(batch)) {
    redirect(`/production/batches/${id}`);
  }

  const preparedAt = batch.preparedAt
    ? new Date(batch.preparedAt).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <Link
          href={`/production/batches/${id}`}
          className="text-sm font-medium text-zinc-700 underline"
        >
          ← Back to batch detail
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">Edit batch</h1>
        <p className="mt-1 text-sm text-zinc-600">{batch.batchNo}</p>
        {lockedForCorrection ? (
          <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-950 ring-1 ring-amber-100">
            This batch is on loading sheets. You can correct the batch number — it will update everywhere
            that batch was assigned.
          </p>
        ) : null}
        {normalizeQcOutcome(batch.qcOutcome) === "rejected" ? (
          <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-950 ring-1 ring-amber-100">
            This batch is unsuccessful. Update QC values and mark Successful when ready, or discard
            if it cannot be recovered.
          </p>
        ) : null}
      </div>
      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <ProductionBatchForm
          batchId={id}
          lockedInUse={lockedForCorrection}
          initialBatchKind={inferNimraBatchKind(batch)}
          initialBatchNo={batch.batchNo}
          initialProductName={batch.productName}
          initialPreparedAt={preparedAt}
          initialPh={batch.ph ?? ""}
          initialSolids={batch.solids ?? ""}
          initialAppearance={batch.appearance ?? ""}
          initialProvider={batch.provider ?? ""}
          initialHcl={batch.hcl ?? ""}
          initialViscosity={batch.viscosity ?? ""}
          initialQuantity={batch.quantity ?? ""}
          initialDrum={batch.drum ?? ""}
          initialCustomer={batch.customer ?? ""}
          initialQcOutcome={
            normalizeQcOutcome(batch.qcOutcome) === "rejected" ? "rejected" : "approved"
          }
          initialQcComment={batch.qcComment ?? ""}
          initialTotalLiters={batch.totalLiters}
          initialProductionPurpose={batch.productionPurpose === "sample" ? "sample" : "regular"}
        />
      </div>
    </div>
  );
}
