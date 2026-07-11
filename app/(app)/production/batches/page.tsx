import Link from "next/link";

import { AddProductModal } from "@/components/AddProductModal";
import { PageHeader } from "@/components/PageHeader";
import { ProductionBatchRowActions } from "@/components/ProductionBatchRowActions";
import { ProductionBatchTabs } from "@/components/ProductionBatchTabs";
import { auth } from "@/lib/auth";
import { formatLiters } from "@/lib/batchVolume";
import { formatDisplayDate } from "@/lib/dateOnly";
import { connectToDatabase } from "@/lib/db";
import { ProductionBatch } from "@/lib/models/ProductionBatch";
import { openProductionBatchMongoFilter } from "@/lib/productionBatchClose";
import {
  loadBatchUsageContext,
  statusLabel,
  usageForProductionBatch,
  type ProductionBatchStatus,
} from "@/lib/productionBatchStatus";
import {
  remainingSampleLitersForBatch,
  regularProductionBatchMongoFilter,
  sampleProductionBatchMongoFilter,
} from "@/lib/sampleProductionStock";
import { roleFromSession } from "@/lib/roles";
import { ui } from "@/lib/ui";

type PurposeFilter = "all" | "regular" | "sample";

function StatusBadge({ status, label }: { status: ProductionBatchStatus; label: string }) {
  const badgeClass =
    status === "available"
      ? ui.badgeNeutral
      : status === "empty"
        ? ui.badgeWarning
        : ui.badgeInfo;
  return <span className={badgeClass}>{label}</span>;
}

function purposeFilterFromParam(raw: string | undefined): PurposeFilter {
  if (raw === "regular" || raw === "sample") return raw;
  return "all";
}

function mongoFilterForPurpose(purpose: PurposeFilter): Record<string, unknown> {
  if (purpose === "regular") return regularProductionBatchMongoFilter();
  if (purpose === "sample") return sampleProductionBatchMongoFilter();
  return openProductionBatchMongoFilter();
}

type PageProps = {
  searchParams: Promise<{ purpose?: string }>;
};

export default async function ProductionBatchesPage({ searchParams }: PageProps) {
  await connectToDatabase();

  const session = await auth();
  const role = roleFromSession(session?.user as { role?: string });
  const isBatchEditor = role === "batch_editor";

  const sp = await searchParams;
  const purpose = purposeFilterFromParam(sp.purpose);

  const { usedMap, catalog } = await loadBatchUsageContext();
  const batches = await ProductionBatch.find(mongoFilterForPurpose(purpose))
    .sort({ preparedAt: -1, createdAt: -1 })
    .lean();

  const tabClass = (active: boolean) =>
    `rounded-lg px-3 py-1.5 text-sm font-medium ${
      active ? "bg-brand-800 text-white" : "bg-white text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-50"
    }`;

  return (
    <div className="space-y-6">
      <PageHeader
        accent="esha"
        title="Production batches"
        description="Register regular production for customer POs, or sample production for field visit samples. Sample batches are not used on loading sheets."
        actions={
          isBatchEditor ? (
            <>
              <AddProductModal />
              <Link
                href={
                  purpose === "sample"
                    ? "/production/batches/new?purpose=sample"
                    : "/production/batches/new"
                }
                className={ui.btnPrimary}
              >
                Add batch
              </Link>
            </>
          ) : undefined
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <ProductionBatchTabs active="open" />
        <span className="text-zinc-300">|</span>
        <Link href="/production/batches" className={tabClass(purpose === "all")}>
          All
        </Link>
        <Link href="/production/batches?purpose=regular" className={tabClass(purpose === "regular")}>
          Regular production
        </Link>
        <Link href="/production/batches?purpose=sample" className={tabClass(purpose === "sample")}>
          Sample production
        </Link>
      </div>

      {batches.length === 0 ? (
        <p className="empty-state">
          No production batches yet.
          {isBatchEditor ? " Use Add batch when a run is prepared." : null}
        </p>
      ) : (
        <div className={`${ui.card} overflow-x-auto`}>
          <table className={`${ui.dataTable} min-w-[52rem]`}>
            <thead>
              <tr>
                <th>Batch no</th>
                <th>Product</th>
                <th>Purpose</th>
                <th>Date</th>
                <th>Status</th>
                <th>pH</th>
                <th>Quantity</th>
                <th>Remaining</th>
                <th>By</th>
                {isBatchEditor ? <th /> : null}
              </tr>
            </thead>
            <tbody>
              {await Promise.all(
                batches.map(async (b) => {
                  const id = b._id.toString();
                  const isSample = b.productionPurpose === "sample";
                  const sampleRemaining = isSample
                    ? await remainingSampleLitersForBatch({
                        _id: b._id,
                        totalLiters: b.totalLiters,
                      })
                    : null;
                  const usage = isSample
                    ? {
                        usedLiters: Math.max(0, b.totalLiters - (sampleRemaining ?? 0)),
                        remainingLiters: sampleRemaining ?? b.totalLiters,
                        status: (sampleRemaining ?? 0) > 0 ? ("available" as const) : ("empty" as const),
                        locked: false,
                      }
                    : usageForProductionBatch(b, usedMap, catalog);
                  const hasDrum = Boolean(b.drum?.trim());
                  const label = isSample
                    ? sampleRemaining && sampleRemaining > 0
                      ? `Sample (${formatLiters(sampleRemaining)} L left)`
                      : "Sample (empty)"
                    : statusLabel(usage.status, usage.remainingLiters);
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
                      <td>
                        {b.productName}
                        {hasDrum ? (
                          <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-900">
                            Drum
                          </span>
                        ) : null}
                      </td>
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
                      <td>{formatDisplayDate(b.preparedAt)}</td>
                      <td>
                        <StatusBadge status={usage.status} label={label} />
                      </td>
                      <td>{b.ph?.trim() || "—"}</td>
                      <td>{b.quantity?.trim() || "—"}</td>
                      <td>
                        {formatLiters(usage.remainingLiters)} L
                        {usage.usedLiters > 0 ? (
                          <span className="block text-xs text-slate-500">
                            of {formatLiters(b.totalLiters)} L
                          </span>
                        ) : null}
                      </td>
                      <td>{b.createdByName || "—"}</td>
                      {isBatchEditor ? (
                        <td>
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
                }),
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
