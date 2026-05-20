import Link from "next/link";
import { notFound } from "next/navigation";
import mongoose from "mongoose";

import { auth } from "@/lib/auth";
import { formatLiters } from "@/lib/batchVolume";
import { connectToDatabase } from "@/lib/db";
import { ProductionBatch } from "@/lib/models/ProductionBatch";
import {
  loadBatchUsageContext,
  statusLabel,
  usageForBatchNo,
  type ProductionBatchStatus,
} from "@/lib/productionBatchStatus";
import { isViscosityApplicableBatchFamily } from "@/lib/viscosityBatchFamily";
import { roleFromSession } from "@/lib/roles";

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
  if (!role || (role !== "batch_editor" && role !== "dispatch_editor")) {
    notFound();
  }

  await connectToDatabase();
  const batch = await ProductionBatch.findById(id).lean();
  if (!batch) notFound();

  const { usedMap } = await loadBatchUsageContext();
  const usage = usageForBatchNo(batch.batchNo, batch.totalLiters, usedMap);
  const label = statusLabel(usage.status, usage.remainingLiters);

  const isBatchEditor = role === "batch_editor";

  return (
    <div className="space-y-6">
      <div>
        <Link href="/production/batches" className="text-sm font-medium text-zinc-700 underline">
          ← Back to batches
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">Batch {batch.batchNo}</h1>
        <p className="mt-1 text-sm text-zinc-600">Full record as entered at registration — for audit and feedback checks.</p>
        <div className="mt-2">
          <StatusBadge status={usage.status} label={label} />
        </div>
        {usage.locked ? (
          <p className="mt-2 text-sm text-amber-800">
            This batch is locked because it has been assigned on loading sheets. QC data cannot be changed.
          </p>
        ) : null}
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white px-4 py-2">
        <dl>
          <DetailRow label="Batch number" value={batch.batchNo} />
          <DetailRow label="Product" value={batch.productName} />
          <DetailRow label="Date" value={new Date(batch.preparedAt).toLocaleDateString()} />
          <DetailRow label="Used on POs" value={`${formatLiters(usage.usedLiters)} L`} />
          <DetailRow label="Remaining pool" value={`${formatLiters(usage.remainingLiters)} L`} />
          <DetailRow label="pH" value={batch.ph ?? ""} />
          <DetailRow label="Solids" value={batch.solids ?? ""} />
          <DetailRow label="Appearance" value={batch.appearance ?? ""} />
          <DetailRow label="Provider" value={batch.provider ?? ""} />
          <DetailRow label="HCL" value={batch.hcl ?? ""} />
          {isViscosityApplicableBatchFamily(batch.productName) || batch.viscosity?.trim() ? (
            <DetailRow label="Viscosity" value={batch.viscosity ?? ""} />
          ) : null}
          <DetailRow label="Quantity" value={batch.quantity ?? ""} />
          <DetailRow label="Total liters (dispatch pool)" value={`${formatLiters(batch.totalLiters)} L`} />
          <DetailRow label="Registered by" value={batch.createdByName ?? ""} />
          <DetailRow
            label="Registered at"
            value={batch.createdAt ? new Date(batch.createdAt).toLocaleString() : ""}
          />
          {batch.notes?.trim() ? <DetailRow label="Legacy notes" value={batch.notes} /> : null}
        </dl>
      </div>

      {isBatchEditor && !usage.locked ? (
        <Link
          href={`/production/batches/${id}/edit`}
          className="inline-block rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
        >
          Edit batch
        </Link>
      ) : null}
    </div>
  );
}
