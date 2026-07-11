import Link from "next/link";

import { PageHeader } from "@/components/PageHeader";
import { ProductionBatchTabs } from "@/components/ProductionBatchTabs";
import { auth } from "@/lib/auth";
import { formatLiters } from "@/lib/batchVolume";
import { formatDisplayDate } from "@/lib/dateOnly";
import { connectToDatabase } from "@/lib/db";
import { ProductionBatch } from "@/lib/models/ProductionBatch";
import { closedProductionBatchMongoFilter } from "@/lib/productionBatchClose";
import { adminCanViewOperations, roleFromSession } from "@/lib/roles";
import { ui } from "@/lib/ui";

export default async function ClosedProductionBatchesPage() {
  await connectToDatabase();

  const session = await auth();
  const role = roleFromSession(session?.user as { role?: string });
  const canView =
    role === "batch_editor" || role === "dispatch_editor" || adminCanViewOperations(role);
  if (!canView) {
    return null;
  }

  const batches = await ProductionBatch.find(closedProductionBatchMongoFilter())
    .sort({ closedAt: -1 })
    .lean();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Closed batches"
        description="Batches Esha closed after recording waste. Read-only archive — no edits."
      />

      <ProductionBatchTabs active="closed" />

      {batches.length === 0 ? (
        <p className="empty-state">No closed batches yet.</p>
      ) : (
        <div className={`${ui.card} overflow-x-auto`}>
          <table className={`${ui.dataTable} min-w-[48rem]`}>
            <thead>
              <tr>
                <th>Batch no</th>
                <th>Product</th>
                <th>Purpose</th>
                <th>Closed</th>
                <th>Waste (L)</th>
                <th>Closed by</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => {
                const id = b._id.toString();
                const isSample = b.productionPurpose === "sample";
                return (
                  <tr key={id}>
                    <td className="font-semibold text-slate-900">
                      <Link
                        href={`/production/batches/${id}`}
                        className="text-brand-800 underline decoration-brand-200 underline-offset-2 hover:text-brand-950"
                      >
                        {b.batchNo}
                      </Link>
                    </td>
                    <td>{b.productName}</td>
                    <td>
                      <span
                        className={
                          isSample
                            ? "rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-900"
                            : "rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700"
                        }
                      >
                        {isSample ? "Sample" : "Regular"}
                      </span>
                    </td>
                    <td>
                      {b.closedAt ? formatDisplayDate(b.closedAt) : "—"}
                    </td>
                    <td>{formatLiters(b.closureWasteLiters ?? 0)}</td>
                    <td>{b.closedByName?.trim() || "—"}</td>
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
