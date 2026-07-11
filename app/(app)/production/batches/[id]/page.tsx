import Link from "next/link";
import { notFound } from "next/navigation";
import mongoose from "mongoose";

import { ProductionBatchCloseForm } from "@/components/ProductionBatchCloseForm";
import { auth } from "@/lib/auth";
import { formatLiters } from "@/lib/batchVolume";
import { formatDisplayDate, formatDisplayDateTime } from "@/lib/dateOnly";
import { connectToDatabase } from "@/lib/db";
import { ProductionBatch } from "@/lib/models/ProductionBatch";
import { isBatchClosed } from "@/lib/productionBatchClose";
import { normalizeQcOutcome } from "@/lib/productionBatchQc";
import {
  loadBatchUsageContext,
  statusLabel,
  usageForProductionBatch,
  type ProductionBatchStatus,
} from "@/lib/productionBatchStatus";
import { isViscosityApplicableBatchFamily } from "@/lib/viscosityBatchFamily";
import { adminCanViewOperations, canEditProductionBatches, roleFromSession } from "@/lib/roles";

type PageProps = {
  params: Promise<{ id: string }>;
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 border-b border-zinc-100 py-3 sm:grid-cols-3">
      <dt className="text-sm font-medium text-zinc-600">{label}</dt>
      <dd className="text-sm text-zinc-900 sm:col-span-2">{value || "—"}</dd>
    </div>
  );
}

function StatusBadge({ status, label }: { status: ProductionBatchStatus; label: string }) {
  const styles =
    status === "available"
      ? "bg-zinc-100 text-zinc-800 ring-zinc-200"
      : status === "empty"
        ? "bg-amber-50 text-amber-900 ring-amber-200"
        : "bg-blue-50 text-blue-900 ring-blue-200";
  return (
    <span className={`inline-block rounded-md px-2 py-1 text-sm font-medium ring-1 ${styles}`}>
      {label}
    </span>
  );
}

export default async function ProductionBatchDetailPage(props: PageProps) {
  const { id } = await props.params;
  if (!mongoose.Types.ObjectId.isValid(id)) notFound();

  const session = await auth();
  const role = roleFromSession(session?.user as { role?: string });
  if (
    !role ||
    !(role === "batch_editor" || role === "dispatch_editor" || adminCanViewOperations(role))
  ) {
    notFound();
  }

  await connectToDatabase();
  const batch = await ProductionBatch.findById(id).lean();
  if (!batch) notFound();

  const closed = isBatchClosed(batch);
  const { usedMap, catalog } = await loadBatchUsageContext();
  const usage = usageForProductionBatch(batch, usedMap, catalog);
  const label = closed
    ? "Closed"
    : statusLabel(usage.status, usage.remainingLiters);

  const isBatchEditor = canEditProductionBatches(role);
  const qcApproved = normalizeQcOutcome(batch.qcOutcome) === "approved";
  const canClose = isBatchEditor && !closed && qcApproved;

  const displayUsed = closed
    ? formatLiters(batch.closureUsedLitersSnapshot ?? usage.usedLiters)
    : formatLiters(usage.usedLiters);
  const displayRemaining = closed
    ? formatLiters(batch.closureRemainingLitersSnapshot ?? 0)
    : formatLiters(usage.remainingLiters);

  return (
    <div className="space-y-6">
      <div>
        <Link href={closed ? "/production/batches/closed" : "/production/batches"} className="text-sm font-medium text-zinc-700 underline">
          ← Back to {closed ? "closed batches" : "batches"}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">Batch {batch.batchNo}</h1>
        <p className="mt-1 text-sm text-zinc-600">
          {closed
            ? "Closed batch — read-only archive."
            : "Full record as entered at registration — for audit and feedback checks."}
        </p>
        <div className="mt-2">
          <StatusBadge
            status={closed ? "empty" : usage.status}
            label={label}
          />
        </div>
        {!closed && usage.locked ? (
          <p className="mt-2 text-sm text-amber-800">
            This batch is on loading sheets. QC data is locked — use{" "}
            <strong>Correct batch number</strong> to fix a wrong batch no.
          </p>
        ) : null}
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white px-4 py-2">
        <dl>
          <DetailRow label="Batch number" value={batch.batchNo} />
          <DetailRow label="Product" value={batch.productName} />
          <DetailRow label="Purpose" value={batch.productionPurpose === "sample" ? "Sample" : "Regular"} />
          <DetailRow label="Date" value={formatDisplayDate(batch.preparedAt)} />
          <DetailRow label="Used on POs / filling" value={`${displayUsed} L`} />
          <DetailRow label="Remaining pool (at close)" value={`${displayRemaining} L`} />
          <DetailRow label="pH" value={batch.ph ?? ""} />
          <DetailRow label="Solids" value={batch.solids ?? ""} />
          <DetailRow label="Appearance" value={batch.appearance ?? ""} />
          <DetailRow label="Provider" value={batch.provider ?? ""} />
          <DetailRow label="HCL" value={batch.hcl ?? ""} />
          {isViscosityApplicableBatchFamily(batch.productName) || batch.viscosity?.trim() ? (
            <DetailRow label="Viscosity" value={batch.viscosity ?? ""} />
          ) : null}
          <DetailRow label="Quantity" value={batch.quantity ?? ""} />
          {batch.drum?.trim() ? <DetailRow label="Drum" value={batch.drum} /> : null}
          {batch.customer?.trim() ? <DetailRow label="Customer" value={batch.customer} /> : null}
          <DetailRow label="Total liters (dispatch pool)" value={`${formatLiters(batch.totalLiters)} L`} />
          <DetailRow label="Registered by" value={batch.createdByName ?? ""} />
          <DetailRow
            label="Registered at"
            value={batch.createdAt ? formatDisplayDateTime(batch.createdAt) : ""}
          />
          {batch.notes?.trim() ? <DetailRow label="Legacy notes" value={batch.notes} /> : null}
        </dl>
      </div>

      {closed ? (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <h2 className="text-lg font-semibold text-zinc-900">Closure record</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div>
              <dt className="font-medium text-zinc-600">Waste recorded</dt>
              <dd className="text-zinc-900">{formatLiters(batch.closureWasteLiters ?? 0)} L</dd>
            </div>
            {batch.closureWasteNote?.trim() ? (
              <div>
                <dt className="font-medium text-zinc-600">Note</dt>
                <dd className="text-zinc-900">{batch.closureWasteNote}</dd>
              </div>
            ) : null}
            <div>
              <dt className="font-medium text-zinc-600">Closed by</dt>
              <dd className="text-zinc-900">
                {batch.closedByName?.trim() || "—"}
                {batch.closedAt ? ` · ${formatDisplayDateTime(batch.closedAt)}` : ""}
              </dd>
            </div>
          </dl>
        </div>
      ) : null}

      {canClose ? (
        <ProductionBatchCloseForm
          batchId={id}
          batchNo={batch.batchNo}
          remainingLiters={usage.remainingLiters}
          usedLiters={usage.usedLiters}
        />
      ) : null}

      {!closed && isBatchEditor && !usage.locked ? (
        <Link
          href={`/production/batches/${id}/edit`}
          className="inline-block rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
        >
          Edit batch
        </Link>
      ) : null}
      {!closed && isBatchEditor && usage.locked ? (
        <Link
          href={`/production/batches/${id}/edit`}
          className="inline-block rounded-lg bg-amber-800 px-4 py-2 text-sm font-medium text-white"
        >
          Correct batch number
        </Link>
      ) : null}
    </div>
  );
}
