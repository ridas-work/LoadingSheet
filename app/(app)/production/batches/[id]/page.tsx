import Link from "next/link";
import { notFound } from "next/navigation";
import mongoose from "mongoose";

import { auth } from "@/lib/auth";
import { formatLiters } from "@/lib/batchVolume";
import { connectToDatabase } from "@/lib/db";
import { ProductionBatch } from "@/lib/models/ProductionBatch";
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

  const isBatchEditor = role === "batch_editor";

  return (
    <div className="space-y-6">
      <div>
        <Link href="/production/batches" className="text-sm font-medium text-zinc-700 underline">
          ← Back to batches
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">Batch {batch.batchNo}</h1>
        <p className="mt-1 text-sm text-zinc-600">Full record as entered at registration — for audit and feedback checks.</p>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white px-4 py-2">
        <dl>
          <DetailRow label="Batch number" value={batch.batchNo} />
          <DetailRow label="Product" value={batch.productName} />
          <DetailRow label="Date" value={new Date(batch.preparedAt).toLocaleDateString()} />
          <DetailRow label="pH" value={batch.ph ?? ""} />
          <DetailRow label="Solids" value={batch.solids ?? ""} />
          <DetailRow label="Appearance" value={batch.appearance ?? ""} />
          <DetailRow label="Provider" value={batch.provider ?? ""} />
          <DetailRow label="Drum" value={batch.drum ?? ""} />
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

      {isBatchEditor ? (
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
