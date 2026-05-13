"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

import { PrintSheetButton } from "@/components/PrintSheetButton";
import {
  formatLiters,
  getRowBatchIssues,
  normalizeBatchNo,
  summarizeBatchUsage,
  validateAndComputeWeights,
  type BatchDef,
  type CatalogProduct,
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
  initialBatchDefs: BatchDef[];
  canEditBatches: boolean;
  initialEditMode: boolean;
  initialDispatch: DispatchFields;
  canEditDispatch: boolean;
  initialDispatchEditMode: boolean;
  backHref: string;
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
  initialBatchDefs,
  canEditBatches,
  initialEditMode,
  initialDispatch,
  canEditDispatch,
  initialDispatchEditMode,
  backHref,
}: Props) {
  const router = useRouter();
  const [editMode, setEditMode] = useState(initialEditMode);
  const [dispatchEditMode, setDispatchEditMode] = useState(initialDispatchEditMode);
  const [dispatch, setDispatch] = useState<DispatchFields>(initialDispatch);
  const [batches, setBatches] = useState<Record<number, string>>(() => {
    const initial: Record<number, string> = {};
    for (const line of sheetLines) {
      initial[line.boxNo] = line.batchNo ?? "";
    }
    return initial;
  });
  const [batchTotals, setBatchTotals] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const d of initialBatchDefs) {
      const key = normalizeBatchNo(d.batchNo).toLowerCase();
      if (key) initial[key] = String(d.totalLiters);
    }
    return initial;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const sheetUrl = `/orders/${orderId}/loading-sheet`;
  const editUrl = `${sheetUrl}?edit=1`;
  const dispatchUrl = `${sheetUrl}?dispatch=1`;

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

  const distinctBatchNos = useMemo(() => {
    const set = new Set<string>();
    for (const line of volumeLines) {
      const bn = normalizeBatchNo(line.batchNo);
      if (bn) set.add(bn);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [volumeLines]);

  const parsedBatchDefs = useMemo((): BatchDef[] => {
    return distinctBatchNos.map((batchNo) => ({
      batchNo,
      totalLiters: Number(batchTotals[batchNo.toLowerCase()] ?? 0),
    }));
  }, [batchTotals, distinctBatchNos]);

  const usagePreview = useMemo(
    () => summarizeBatchUsage(volumeLines, parsedBatchDefs, catalog),
    [catalog, parsedBatchDefs, volumeLines],
  );

  const previewWeights = useMemo(() => {
    const result = validateAndComputeWeights(volumeLines, parsedBatchDefs, catalog);
    if (!result.ok) return new Map<number, number | null>();
    return result.weights;
  }, [catalog, parsedBatchDefs, volumeLines]);

  const rowIssues = useMemo(
    () => getRowBatchIssues(volumeLines, parsedBatchDefs, catalog),
    [catalog, parsedBatchDefs, volumeLines],
  );

  const rowIssueByBox = useMemo(() => new Map(rowIssues.map((i) => [i.boxNo, i])), [rowIssues]);

  const validation = useMemo(
    () => validateAndComputeWeights(volumeLines, parsedBatchDefs, catalog),
    [catalog, parsedBatchDefs, volumeLines],
  );

  const canSave = validation.ok && !saving;

  const onSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    setSaved(false);

    const clientCheck = validateAndComputeWeights(volumeLines, parsedBatchDefs, catalog);
    if (!clientCheck.ok) {
      setSaving(false);
      setError(clientCheck.error);
      return;
    }

    const payload = {
      batches: sheetLines.map((line) => ({
        boxNo: line.boxNo,
        batchNo: batches[line.boxNo] ?? "",
      })),
      batchDefs: parsedBatchDefs,
    };

    const res = await fetch(`/api/orders/${orderId}/batches`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError((data as { error?: string }).error ?? "Save failed");
      return;
    }

    setSaved(true);
    setSavedMessage("Batches and liters saved.");
    setEditMode(false);
    router.replace(sheetUrl);
    router.refresh();
  }, [batches, catalog, orderId, parsedBatchDefs, router, sheetLines, sheetUrl, volumeLines]);

  const onSaveDispatch = useCallback(async () => {
    setSaving(true);
    setError(null);
    setSaved(false);

    const res = await fetch(`/api/orders/${orderId}/dispatch`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dispatch),
    });

    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError((data as { error?: string }).error ?? "Save failed");
      return;
    }

    setSaved(true);
    setSavedMessage("Dispatch details saved.");
    setDispatchEditMode(false);
    router.replace(sheetUrl);
    router.refresh();
  }, [dispatch, orderId, router, sheetUrl]);

  const cartonLabel = useMemo(
    () => `${sheetLines.length} carton${sheetLines.length !== 1 ? "s" : ""}`,
    [sheetLines.length],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={backHref} className="text-sm font-medium text-zinc-700 underline">
          ← Back
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {canEditBatches && !editMode ? (
            <Link
              href={editUrl}
              className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-zinc-900 shadow-sm ring-1 ring-zinc-200"
            >
              Edit batches
            </Link>
          ) : null}
          {canEditBatches && editMode ? (
            <>
              <Link
                href={sheetUrl}
                className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-zinc-900 shadow-sm ring-1 ring-zinc-200"
              >
                View only
              </Link>
              <button
                type="button"
                onClick={onSave}
                disabled={!canSave}
                className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save batches"}
              </button>
            </>
          ) : null}
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
                disabled={saving}
                className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save dispatch"}
              </button>
            </>
          ) : null}
          <PrintSheetButton />
        </div>
      </div>

      {!validation.ok && editMode && canEditBatches ? (
        <p className="text-sm text-red-700 print:hidden">{validation.error}</p>
      ) : null}
      {error ? <p className="text-sm text-red-700 print:hidden">{error}</p> : null}
      {saved && savedMessage ? (
        <p className="text-sm text-emerald-700 print:hidden">{savedMessage}</p>
      ) : null}

      {canEditBatches && editMode && distinctBatchNos.length > 0 ? (
        <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 print:hidden">
          <p className="text-sm font-medium text-zinc-900">Batch sizes (liters)</p>
          <p className="text-xs text-zinc-600">
            Bottle stickers may show kg; enter and track batch totals in liters. Weight per row is auto-calculated.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {distinctBatchNos.map((batchNo) => (
              <label key={batchNo} className="block text-sm">
                <span className="font-medium text-zinc-800">Batch {batchNo} — total liters</span>
                <input
                  type="number"
                  min="0.001"
                  step="any"
                  value={batchTotals[batchNo.toLowerCase()] ?? ""}
                  onChange={(e) => {
                    setSaved(false);
                    setBatchTotals((prev) => ({ ...prev, [batchNo.toLowerCase()]: e.target.value }));
                  }}
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
                  placeholder="e.g. 1000"
                />
              </label>
            ))}
          </div>
          {usagePreview.summaries.length > 0 ? (
            <ul className="space-y-1 text-sm text-zinc-700">
              {usagePreview.summaries.map((s) => (
                <li key={s.batchNo}>
                  Batch <span className="font-medium">{s.batchNo}</span>: {formatLiters(s.usedLiters)} /{" "}
                  {formatLiters(s.totalLiters)} L used
                  {s.totalLiters > 0 ? (
                    <span className={s.remainingLiters < 0 ? " text-red-700" : " text-zinc-500"}>
                      {" "}
                      ({formatLiters(s.remainingLiters)} L remaining)
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
          {usagePreview.missingProducts.length > 0 ? (
            <p className="text-sm text-amber-800">
              Missing liters-per-bottle for: {usagePreview.missingProducts.join(", ")}. Run{" "}
              <code className="text-xs">npm run seed:products</code> or fix catalog.
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="rounded-xl border border-zinc-900 bg-white p-4 text-black shadow-sm print:border-0 print:p-2 print:shadow-none">
        <div className="mb-4 grid grid-cols-1 gap-2 text-sm md:grid-cols-2 print:text-xs">
          <HeaderField
            label="VEHICLE NO:"
            value={dispatch.vehicleNo}
            editing={dispatchEditMode && canEditDispatch}
            onChange={(v) => {
              setSaved(false);
              setDispatch((d) => ({ ...d, vehicleNo: v }));
            }}
          />
          <HeaderField
            label="DRIVER NAME:"
            value={dispatch.driverName}
            editing={dispatchEditMode && canEditDispatch}
            onChange={(v) => {
              setSaved(false);
              setDispatch((d) => ({ ...d, driverName: v }));
            }}
          />
          <HeaderField
            label="DC NO:"
            value={dispatch.dcNo}
            editing={dispatchEditMode && canEditDispatch}
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
            editing={dispatchEditMode && canEditDispatch}
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
                const showInputs = editMode && canEditBatches;
                const rowIssue = rowIssueByBox.get(row.boxNo);
                const displayWeight =
                  showInputs && rowIssue
                    ? null
                    : showInputs
                      ? previewWeights.get(row.boxNo) ?? row.weight
                      : row.weight;
                return (
                  <tr
                    key={row.boxNo}
                    className={rowIssue && showInputs ? "bg-red-50 print:bg-transparent" : undefined}
                  >
                    <td className="border border-black px-1 py-1 text-center">{row.boxNo}</td>
                    <td className="border border-black px-1 py-1">{row.productName}</td>
                    <td className="border border-black px-1 py-1 text-center">{row.bottlesPerBox}</td>
                    <td className="border border-black px-1 py-1 text-center">
                      {showInputs ? (
                        <div className="space-y-0.5">
                          <input
                            type="text"
                            value={batchValue}
                            onChange={(e) => {
                              setSaved(false);
                              setError(null);
                              setBatches((prev) => ({ ...prev, [row.boxNo]: e.target.value }));
                            }}
                            className={`w-full min-w-[4rem] rounded border px-1 py-0.5 text-center text-sm print:hidden ${
                              rowIssue ? "border-red-500 bg-red-50" : "border-zinc-300"
                            }`}
                            placeholder="Batch"
                            aria-invalid={rowIssue ? true : undefined}
                          />
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
                        rowIssue && showInputs ? "text-red-700 line-through print:text-black print:no-underline" : ""
                      }`}
                    >
                      {rowIssue && showInputs ? "—" : weightCell(displayWeight)}
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
            editing={dispatchEditMode && canEditDispatch}
            onChange={(v) => {
              setSaved(false);
              setDispatch((d) => ({ ...d, productionIncharge: v }));
            }}
          />
          <FooterField
            label="SECURITY:"
            value={dispatch.securityName}
            editing={dispatchEditMode && canEditDispatch}
            onChange={(v) => {
              setSaved(false);
              setDispatch((d) => ({ ...d, securityName: v }));
            }}
          />
          <FooterField
            label="DRIVER:"
            value={dispatch.driverSignature || dispatch.driverName}
            editing={dispatchEditMode && canEditDispatch}
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
