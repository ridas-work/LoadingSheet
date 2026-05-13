import Link from "next/link";

import { ProductionBatchRowActions } from "@/components/ProductionBatchRowActions";
import { auth } from "@/lib/auth";
import { formatLiters } from "@/lib/batchVolume";
import { connectToDatabase } from "@/lib/db";
import { ProductionBatch } from "@/lib/models/ProductionBatch";
import { roleFromSession } from "@/lib/roles";

export default async function ProductionBatchesPage() {
  await connectToDatabase();

  const session = await auth();
  const role = roleFromSession(session?.user as { role?: string });
  const isBatchEditor = role === "batch_editor";

  const batches = await ProductionBatch.find({}).sort({ preparedAt: -1, createdAt: -1 }).lean();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Production batches</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Register each prepared batch (number, product, liters). Rashid assigns batches to POs at dispatch.
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
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 text-left">
                <th className="px-4 py-2 font-medium">Batch no</th>
                <th className="px-4 py-2 font-medium">Product</th>
                <th className="px-4 py-2 font-medium">Liters</th>
                <th className="px-4 py-2 font-medium">Prepared</th>
                <th className="px-4 py-2 font-medium">By</th>
                {isBatchEditor ? <th className="px-4 py-2 font-medium" /> : null}
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => (
                <tr key={b._id.toString()} className="border-b border-zinc-100 last:border-0">
                  <td className="px-4 py-2 font-medium text-zinc-900">{b.batchNo}</td>
                  <td className="px-4 py-2 text-zinc-700">{b.productName}</td>
                  <td className="px-4 py-2 text-zinc-700">{formatLiters(b.totalLiters)} L</td>
                  <td className="px-4 py-2 text-zinc-600">
                    {new Date(b.preparedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2 text-zinc-600">{b.createdByName || "—"}</td>
                  {isBatchEditor ? (
                    <td className="px-4 py-2">
                      <ProductionBatchRowActions
                        batchId={b._id.toString()}
                        batchNo={b.batchNo}
                        canManage={isBatchEditor}
                      />
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

