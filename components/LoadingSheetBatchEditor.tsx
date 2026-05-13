"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

import { PrintSheetButton } from "@/components/PrintSheetButton";
import {
  effectiveBatchDefsForOrder,
  formatLiters,
  getRowBatchIssues,
  normalizeBatchNo,
  poolToBatchDefs,
  productsMatch,
  usageLitersByBatchFromLines,
  validateAndComputeWeights,
  type CatalogProduct,
  type ProductionBatchPoolItem,
} from "@/lib/batchVolume";
import { type DispatchFields } from "@/lib/roles";

export type LoadingSheetLine = {
  boxNo: number;
  productName: string;
  bottlesPerBox: number;
  batchNo: string;
  weight: number | null;
};

type Props = {
  orderId: string;
  poNumber: string;
  customerName: string;
  createdDate: string;
  sheetLines: LoadingSheetLine[];
  catalog: CatalogProduct[];
  productionBatches: ProductionBatchPoolItem[];
  usedLitersElsewhere: Record<string, number>;
  initialDispatch: DispatchFields;
  canEditDispatch: boolean;
  initialDispatchEditMode: boolean;
  backHref: string;
  dispatchTripId?: string | null;
  dispatchTripHref?: string | null;
};

function HeaderField({
  label,
  value,
  editing,
  onChange,
  colSpan,
}: {
  label: string;
  value: string;
  editing: boolean;
  onChange: (v: string) => void;
  colSpan?: boolean;
}) {
  return (
    <div className={`flex gap-2 border-b border-zinc-300 py-1 ${colSpan ? "md:col-span-2" : ""}`}>
      <span className="font-semibold whitespace-nowrap">{label}</span>
      {editing ? (
        <>
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="min-h-[1.25rem] flex-1 border-b border-zinc-400 bg-transparent text-sm outline-none print:hidden"
          />
          <span className="hidden min-h-[1.25rem] flex-1 border-b border-black print:inline">{value}</span>
        </>
      ) : (
        <span className="min-h-[1.25rem] flex-1 border-b border-dotted border-zinc-400 print:border-black">
          {value}
        </span>
      )}
    </div>
  );
}

function FooterField({
  label,
  value,
  editing,
  onChange,
}: {
  label: string;
  value: string;
  editing: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-semibold">{label}</span>
      {editing ? (
        <>
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="min-h-[2rem] border-b border-black bg-transparent text-sm outline-none print:hidden"
          />
          <span className="hidden min-h-[2rem] border-b border-black print:inline">{value}</span>
        </>
      ) : (
        <span className="min-h-[2rem] border-b border-black">{value}</span>
      )}
    </div>
  );
}

function weightCell(value: number | null | undefined): string {
  if (value == null) return "";
  return formatLiters(value);
}

export function LoadingSheetBatchEditor({
  orderId,
  poNumber,
  customerName,
  createdDate,
  sheetLines,
  catalog,
  productionBatches,
  usedLitersElsewhere,
  initialDispatch,
  canEditDispatch,
  initialDispatchEditMode,
  backHref,
  dispatchTripId,
  dispatchTripHref,
}: Props) {
  const router = useRouter();
  const [dispatchEditMode, setDispatchEditMode] = useState(initialDispatchEditMode);
  const [dispatch, setDispatch] = useState<DispatchFields>(initialDispatch);
  const [batches, setBatches] = useState<Record<number, string>>(() => {
    const initial: Record<number, string> = {};
    for (const line of sheetLines) {
      initial[line.boxNo] = line.batchNo ?? "";
    }
    return initial;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const sheetUrl = `/orders/${orderId}/loading-sheet`;
  const dispatchUrl = `${sheetUrl}?dispatch=1`;

  const usedElsewhereMap = useMemo(
    () => new Map(Object.entries(usedLitersElsewhere).map(([k, v]) => [k.toLowerCase(), v])),
    [usedLitersElsewhere],
  );

  const effectiveBatchDefs = useMemo(
    () => effectiveBatchDefsForOrder(poolToBatchDefs(productionBatches), usedElsewhereMap),
    [productionBatches, usedElsewhereMap],
  );

  const volumeLines = useMemo(
    () =>
      sheetLines.map((line) => ({
        boxNo: line.boxNo,
        productName: line.productName,
        bottlesPerBox: line.bottlesPerBox,
        batchNo: batches[line.boxNo] ?? "",
      })),
    [batches, sheetLines],
  );

  const currentOrderUsedByBatch = useMemo(
    () => usageLitersByBatchFromLines(volumeLines, catalog),
    [catalog, volumeLines],
  );

  const previewWeights = useMemo(() => {
    const result = validateAndComputeWeights(volumeLines, effectiveBatchDefs, catalog);
    if (!result.ok) return new Map<number, number | null>();
    return result.weights;
  }, [catalog, effectiveBatchDefs, volumeLines]);

  const rowIssues = useMemo(
    () => getRowBatchIssues(volumeLines, effectiveBatchDefs, catalog),
    [catalog, effectiveBatchDefs, volumeLines],
  );

  const rowIssueByBox = useMemo(() => new Map(rowIssues.map((i) => [i.boxNo, i])), [rowIssues]);

  const validation = useMemo(
    () => validateAndComputeWeights(volumeLines, effectiveBatchDefs, catalog),
    [catalog, effectiveBatchDefs, volumeLines],
  );

  const batchesForRow = useCallback(
    (productName: string) =>
      productionBatches.filter((pb) => productsMatch(pb.productName, productName, catalog)),
    [catalog, productionBatches],
  );

  const canSaveDispatch = validation.ok && !saving;

  const onSaveDispatch = useCallback(async () => {
    setSaving(true);
    setError(null);
    setSaved(false);

    if (!validation.ok) {
      setSaving(false);
      setError(validation.error);
      return;
    }

    const assignments = sheetLines.map((line) => ({
      boxNo: line.boxNo,
      batchNo: batches[line.boxNo] ?? "",
    }));

    const batchRes = await fetch(`/api/orders/${orderId}/batch-assignments`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignments }),
    });

    if (!batchRes.ok) {
      const data = await batchRes.json().catch(() => ({}));
      setSaving(false);
      setError((data as { error?: string }).error ?? "Batch assignment failed");
      return;
    }

    if (dispatchTripId != null && dispatchTripId.length > 0) {
      setSaving(false);
      setSaved(true);
      setSavedMessage("Batch assignments saved.");
      setDispatchEditMode(false);
      router.replace(sheetUrl);
      router.refresh();
      return;
    }

    const dispatchRes = await fetch(`/api/orders/${orderId}/dispatch`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dispatch),
    });

    setSaving(false);

    if (!dispatchRes.ok) {
      const data = await dispatchRes.json().catch(() => ({}));
      setError((data as { error?: string }).error ?? "Dispatch save failed");
      return;
    }

    setSaved(true);
    setSavedMessage(
      dispatchTripId ? "Batch assignments saved." : "Dispatch and batch assignments saved.",
    );
    setDispatchEditMode(false);
    router.replace(sheetUrl);
    router.refresh();
  }, [batches, dispatch, dispatchTripId, orderId, router, sheetLines, sheetUrl, validation]);

  const cartonLabel = useMemo(
    () => `${sheetLines.length} carton${sheetLines.length !== 1 ? "s" : ""}`,
    [sheetLines.length],
  );

  const showDispatchInputs = dispatchEditMode && canEditDispatch;
  const onTrip = Boolean(dispatchTripId);
  const showVehicleInputs = showDispatchInputs && !onTrip;
  const showBatchInputs = showDispatchInputs;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={backHref} className="text-sm font-medium text-zinc-700 underline">
          ← Back
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {canEditDispatch && !dispatchEditMode ? (
            <Link
              href={dispatchUrl}
              className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-zinc-900 shadow-sm ring-1 ring-zinc-200"
            >
              Edit dispatch
            </Link>
          ) : null}
          {canEditDispatch && dispatchEditMode ? (
            <>
              <Link
                href={sheetUrl}
                className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-zinc-900 shadow-sm ring-1 ring-zinc-200"
              >
                View only
              </Link>
              <button
                type="button"
                onClick={onSaveDispatch}
                disabled={!canSaveDispatch}
                className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save dispatch"}
              </button>
            </>
          ) : null}
          <PrintSheetButton />
        </div>
      </div>

      {!validation.ok && showBatchInputs ? (
        <p className="text-sm text-red-700 print:hidden">{validation.error}</p>
      ) : null}
      {error ? <p className="text-sm text-red-700 print:hidden">{error}</p> : null}
      {saved && savedMessage ? (
        <p className="text-sm text-emerald-700 print:hidden">{savedMessage}</p>
      ) : null}

      {onTrip && showBatchInputs && dispatchTripHref ? (
        <p className="text-sm text-amber-800 print:hidden">
          Vehicle and driver are managed on the{" "}
          <Link href={dispatchTripHref} className="font-medium underline">
            dispatch trip
          </Link>
          . Here you can assign batches only.
        </p>
      ) : null}

      <div className="rounded-xl border border-zinc-900 bg-white p-4 text-black shadow-sm print:border-0 print:p-2 print:shadow-none">
        <div className="mb-4 grid grid-cols-1 gap-2 text-sm md:grid-cols-2 print:text-xs">
          <HeaderField
            label="VEHICLE NO:"
            value={dispatch.vehicleNo}
            editing={showVehicleInputs}
            onChange={(v) => {
              setSaved(false);
              setDispatch((d) => ({ ...d, vehicleNo: v }));
            }}
          />
          <HeaderField
            label="DRIVER NAME:"
            value={dispatch.driverName}
            editing={showVehicleInputs}
            onChange={(v) => {
              setSaved(false);
              setDispatch((d) => ({ ...d, driverName: v }));
            }}
          />
          <HeaderField
            label="DC NO:"
            value={dispatch.dcNo}
            editing={showVehicleInputs}
            onChange={(v) => {
              setSaved(false);
              setDispatch((d) => ({ ...d, dcNo: v }));
            }}
          />
          <div className="flex gap-2 border-b border-zinc-300 py-1">
            <span className="font-semibold whitespace-nowrap">Date:</span>
            <span className="flex-1 border-b border-dotted border-zinc-400 print:border-black">{createdDate}</span>
          </div>
          <HeaderField
            label="HELPER NAME:"
            value={dispatch.helperName}
            editing={showVehicleInputs}
            colSpan
            onChange={(v) => {
              setSaved(false);
              setDispatch((d) => ({ ...d, helperName: v }));
            }}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-black text-sm print:text-[11px]">
            <thead>
              <tr className="bg-zinc-100 print:bg-transparent">
                <th className="border border-black px-1 py-2 font-semibold">Box No</th>
                <th className="border border-black px-1 py-2 font-semibold">PRODUCT NAME</th>
                <th className="border border-black px-1 py-2 font-semibold">NO OF BOTTLES</th>
                <th className="border border-black px-1 py-2 font-semibold">Batch No</th>
                <th className="border border-black px-1 py-2 font-semibold">Weight (L)</th>
                <th className="border border-black px-1 py-2 font-semibold">PO NO</th>
                <th className="border border-black px-1 py-2 font-semibold">Customer Co</th>
              </tr>
            </thead>
            <tbody>
              {sheetLines.map((row) => {
                const batchValue = batches[row.boxNo] ?? "";
                const rowIssue = rowIssueByBox.get(row.boxNo);
                const displayWeight =
                  showBatchInputs && rowIssue
                    ? null
                    : showBatchInputs
                      ? (previewWeights.get(row.boxNo) ?? row.weight)
                      : row.weight;
                const options = batchesForRow(row.productName);

                return (
                  <tr
                    key={row.boxNo}
                    className={rowIssue && showBatchInputs ? "bg-red-50 print:bg-transparent" : undefined}
                  >
                    <td className="border border-black px-1 py-1 text-center">{row.boxNo}</td>
                    <td className="border border-black px-1 py-1">{row.productName}</td>
                    <td className="border border-black px-1 py-1 text-center">{row.bottlesPerBox}</td>
                    <td className="border border-black px-1 py-1 text-center">
                      {showBatchInputs ? (
                        <div className="space-y-0.5">
                          <select
                            value={batchValue}
                            onChange={(e) => {
                              setSaved(false);
                              setError(null);
                              setBatches((prev) => ({ ...prev, [row.boxNo]: e.target.value }));
                            }}
                            className={`w-full min-w-[5rem] rounded border px-1 py-0.5 text-center text-sm print:hidden ${
                              rowIssue ? "border-red-500 bg-red-50" : "border-zinc-300"
                            }`}
                          >
                            <option value="">—</option>
                            {options.map((pb) => {
                              const key = normalizeBatchNo(pb.batchNo).toLowerCase();
                              const elsewhere = usedElsewhereMap.get(key) ?? 0;
                              const onThisOrder = currentOrderUsedByBatch.get(key) ?? 0;
                              const remaining = Math.max(0, pb.totalLiters - elsewhere - onThisOrder);
                              return (
                                <option key={pb.batchNo} value={pb.batchNo}>
                                  {pb.batchNo} ({formatLiters(remaining)} L left)
                                </option>
                              );
                            })}
                          </select>
                          {rowIssue ? (
                            <p className="text-left text-[10px] leading-tight text-red-700 print:hidden">
                              {rowIssue.message}
                            </p>
                          ) : null}
                          <span className="hidden print:inline">{batchValue}</span>
                        </div>
                      ) : (
                        batchValue
                      )}
                    </td>
                    <td
                      className={`border border-black px-1 py-1 text-center ${
                        rowIssue && showBatchInputs
                          ? "text-red-700 line-through print:text-black print:no-underline"
                          : ""
                      }`}
                    >
                      {rowIssue && showBatchInputs ? "—" : weightCell(displayWeight)}
                    </td>
                    <td className="border border-black px-1 py-1 text-center">{poNumber}</td>
                    <td className="border border-black px-1 py-1">{customerName}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 text-sm md:grid-cols-3 print:mt-6 print:text-xs">
          <FooterField
            label="PRODUCTION INCHARGE:"
            value={dispatch.productionIncharge}
            editing={showVehicleInputs}
            onChange={(v) => {
              setSaved(false);
              setDispatch((d) => ({ ...d, productionIncharge: v }));
            }}
          />
          <FooterField
            label="SECURITY:"
            value={dispatch.securityName}
            editing={showVehicleInputs}
            onChange={(v) => {
              setSaved(false);
              setDispatch((d) => ({ ...d, securityName: v }));
            }}
          />
          <FooterField
            label="DRIVER:"
            value={dispatch.driverSignature || dispatch.driverName}
            editing={showVehicleInputs}
            onChange={(v) => {
              setSaved(false);
              setDispatch((d) => ({ ...d, driverSignature: v }));
            }}
          />
        </div>

        <p className="mt-6 text-center text-xs text-zinc-600 print:text-[10px]">
          Loading sheet · PO {poNumber} · {cartonLabel}
        </p>
      </div>
    </div>
  );
}

