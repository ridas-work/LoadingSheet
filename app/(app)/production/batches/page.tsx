import Link from "next/link";

import { ProductionBatchRowActions } from "@/components/ProductionBatchRowActions";
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
import { roleFromSession } from "@/lib/roles";

function StatusBadge({ status, label }: { status: ProductionBatchStatus; label: string }) {
  const styles =
    status === "available"
      ? "bg-zinc-100 text-zinc-800 ring-zinc-200"
      : status === "empty"
        ? "bg-amber-50 text-amber-900 ring-amber-200"
        : "bg-blue-50 text-blue-900 ring-blue-200";
  return (
    <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-medium ring-1 ${styles}`}>
      {label}
    </span>
  );
}

export default async function ProductionBatchesPage() {
  await connectToDatabase();

  const session = await auth();
  const role = roleFromSession(session?.user as { role?: string });
  const isBatchEditor = role === "batch_editor";

  const { usedMap } = await loadBatchUsageContext();
  const batches = await ProductionBatch.find({}).sort({ preparedAt: -1, createdAt: -1 }).lean();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Production batches</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Register each prepared batch with QC details. Batches in use or empty cannot be edited.
          </p>
        </div>
        {isBatchEditor ? (
          <Link
            href="/production/batches/new"
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
          >
            Add batch
          </Link>
        ) : null}
      </div>

      {batches.length === 0 ? (
        <p className="rounded-xl border border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-600">
          No production batches yet.
          {isBatchEditor ? " Use Add batch when a run is prepared." : null}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
          <table className="w-full min-w-[52rem] text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 text-left">
                <th className="px-4 py-2 font-medium">Batch no</th>
                <th className="px-4 py-2 font-medium">Product</th>
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">pH</th>
                <th className="px-4 py-2 font-medium">Quantity</th>
                <th className="px-4 py-2 font-medium">Liters</th>
                <th className="px-4 py-2 font-medium">By</th>
                {isBatchEditor ? <th className="px-4 py-2 font-medium" /> : null}
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => {
                const id = b._id.toString();
                const usage = usageForBatchNo(b.batchNo, b.totalLiters, usedMap);
                const label = statusLabel(usage.status, usage.remainingLiters);
                return (
                  <tr key={id} className="border-b border-zinc-100 last:border-0">
                    <td className="px-4 py-2 font-medium text-zinc-900">
                      <Link href={`/production/batches/${id}`} className="underline hover:text-zinc-700">
                        {b.batchNo}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-zinc-700">{b.productName}</td>
                    <td className="px-4 py-2 text-zinc-600">
                      {new Date(b.preparedAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2">
                      <StatusBadge status={usage.status} label={label} />
                    </td>
                    <td className="px-4 py-2 text-zinc-700">{b.ph?.trim() || "—"}</td>
                    <td className="px-4 py-2 text-zinc-700">{b.quantity?.trim() || "—"}</td>
                    <td className="px-4 py-2 text-zinc-700">{formatLiters(b.totalLiters)} L</td>
                    <td className="px-4 py-2 text-zinc-600">{b.createdByName || "—"}</td>
                    {isBatchEditor ? (
                      <td className="px-4 py-2">
                        <ProductionBatchRowActions
                          batchId={id}
                          batchNo={b.batchNo}
                          canManage={isBatchEditor}
                          locked={usage.locked}
                        />
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
