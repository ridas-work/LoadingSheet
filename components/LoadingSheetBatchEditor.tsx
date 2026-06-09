"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { PrintCartonLabelsButton } from "@/components/PrintCartonLabelsButton";
import { PrintSheetButton } from "@/components/PrintSheetButton";
import { ReadyStockCheck } from "@/components/ReadyStockCheck";
import { cartonLabelsFromSheetLines } from "@/lib/cartonLabels";
import {
  effectiveBatchDefsForOrder,
  formatLiters,
  normalizeBatchNo,
  poolToBatchDefs,
  productsMatch,
  type ProductionBatchPoolItem,
} from "@/lib/batchVolume";
import {
  isBundleProduct,
  resolveBundleParts,
  usageLitersByBatchFromSheetLines,
  validateSheetBatchAllocations,
  type ComponentBatch,
  type PackingCatalogRow,
} from "@/lib/bundleCatalog";
import { isMixedSampleLine, resolveMixedSampleParts } from "@/lib/mixedSampleBox";
import type { DeductionPacking, DeductionSheetLine } from "@/lib/packagingDeduction";
import {
  READY_SHELF_LABEL,
  allocateReadyStockToLines,
  componentNeedsBatch,
  computeSheetLineWeights,
  formatReadyAwareBatchDisplay,
  lineNeedsBatch,
  validateReadyBatchRequirements,
} from "@/lib/readyStockAllocation";
import { type DispatchFields } from "@/lib/roles";
import {
  formatKg,
  lookupStandardCartonWeight,
  validateAllSheetCartonWeights,
  validateSheetLineCartonWeight,
} from "@/lib/standardCartonWeight";

export type LoadingSheetLine = {
  boxNo: number;
  productName: string;
  bottlesPerBox: number;
  lineKind?: string;
  mixedContents?: Array<{ productName: string; bottles: number }>;
  batchNo: string;
  componentBatches?: ComponentBatch[];
  weight: number | null;
  cartonWeightKg?: number | null;
};

function lineHasComponentBatches(line: LoadingSheetLine, catalog: PackingCatalogRow[]): boolean {
  return isMixedSampleLine(line) || isBundleProduct(line.productName, catalog);
}

function resolveLineParts(line: LoadingSheetLine, catalog: PackingCatalogRow[]) {
  if (isMixedSampleLine(line)) return resolveMixedSampleParts(line, catalog);
  return resolveBundleParts(line.productName, catalog);
}

type Props = {
  orderId: string;
  poNumber: string;
  customerName: string;
  createdDate: string;
  sheetLines: LoadingSheetLine[];
  catalog: PackingCatalogRow[];
  productionBatches: ProductionBatchPoolItem[];
  usedLitersElsewhere: Record<string, number>;
  initialDispatch: DispatchFields;
  canEditDispatch: boolean;
  initialDispatchEditMode: boolean;
  backHref: string;
  dispatchTripId?: string | null;
  dispatchTripHref?: string | null;
  batchesLocked?: boolean;
  readyStockNeeds?: Array<{ productCode: string; productName: string; bottles: number }>;
  weightsVerified?: boolean;
  dispatchReadyForGate?: boolean;
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
  batchesLocked = false,
  readyStockNeeds = [],
  weightsVerified = false,
  dispatchReadyForGate = false,
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
  const [componentBatches, setComponentBatches] = useState<Record<number, Record<string, string>>>(
    () => {
      const initial: Record<number, Record<string, string>> = {};
      for (const line of sheetLines) {
        const map: Record<string, string> = {};
        for (const cb of line.componentBatches ?? []) {
          map[cb.productName] = cb.batchNo ?? "";
        }
        initial[line.boxNo] = map;
      }
      return initial;
    },
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [readyStock, setReadyStock] = useState<Record<string, number>>({});
  const [readyBatchLots, setReadyBatchLots] = useState<
    Array<{ batchNo: string; productCode: string; bottles: number; createdAt?: string | null }>
  >([]);
  const [cartonWeights, setCartonWeights] = useState<Record<number, string>>(() => {
    const initial: Record<number, string> = {};
    for (const line of sheetLines) {
      if (line.cartonWeightKg != null && Number.isFinite(line.cartonWeightKg)) {
        initial[line.boxNo] = formatKg(line.cartonWeightKg);
      }
    }
    return initial;
  });

  useEffect(() => {
    if (readyStockNeeds.length === 0) return;
    (async () => {
      const res = await fetch("/api/ready-bottle-stock", { credentials: "same-origin" });
      if (!res.ok) return;
      const data = (await res.json()) as {
        products?: Array<{ productCode: string; onHandBottles: number }>;
        batchLots?: Array<{
          batchNo: string;
          productCode: string;
          bottles: number;
          createdAt?: string | null;
        }>;
      };
      const map: Record<string, number> = {};
      for (const p of data.products ?? []) {
        map[p.productCode] = p.onHandBottles;
      }
      setReadyStock(map);
      setReadyBatchLots(data.batchLots ?? []);
    })();
  }, [readyStockNeeds.length]);

  const catalogDeduction: DeductionPacking[] = useMemo(
    () =>
      catalog.map((p) => ({
        code: p.code,
        name: p.name,
        bottlesPerCarton: p.bottlesPerCarton,
        aliases: p.aliases,
        batchFamily: p.batchFamily,
        bundleComponents: p.bundleComponents,
      })),
    [catalog],
  );

  const readyByBox = useMemo(() => {
    const deductionLines: DeductionSheetLine[] = sheetLines.map((l) => ({
      boxNo: l.boxNo,
      productName: l.productName,
      bottlesPerBox: l.bottlesPerBox,
      lineKind: l.lineKind,
      mixedContents: l.mixedContents,
    }));
    return allocateReadyStockToLines(deductionLines, catalogDeduction, readyStock, readyBatchLots).byBoxNo;
  }, [catalogDeduction, readyBatchLots, readyStock, sheetLines]);

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

  const workingLines = useMemo(
    () =>
      sheetLines.map((line) => {
        if (lineHasComponentBatches(line, catalog)) {
          const parts = resolveLineParts(line, catalog);
          return {
            boxNo: line.boxNo,
            productName: line.productName,
            bottlesPerBox: line.bottlesPerBox,
            lineKind: line.lineKind,
            mixedContents: line.mixedContents,
            batchNo: "",
            componentBatches: parts.map((part) => ({
              productName: part.productName,
              batchNo: componentBatches[line.boxNo]?.[part.productName] ?? "",
            })),
          };
        }
        return {
          boxNo: line.boxNo,
          productName: line.productName,
          bottlesPerBox: line.bottlesPerBox,
          lineKind: line.lineKind,
          batchNo: batches[line.boxNo] ?? "",
          componentBatches: [],
        };
      }),
    [batches, catalog, componentBatches, sheetLines],
  );

  const currentOrderUsedByBatch = useMemo(
    () => usageLitersByBatchFromSheetLines(workingLines, catalog),
    [catalog, workingLines],
  );

  const catalogWeights = useMemo(
    () => computeSheetLineWeights(sheetLines, catalog),
    [catalog, sheetLines],
  );

  const validation = useMemo(() => {
    const batchResult = validateSheetBatchAllocations(workingLines, effectiveBatchDefs, catalog);
    if (!batchResult.ok) return batchResult;
    const readyResult = validateReadyBatchRequirements(workingLines, catalog, readyByBox);
    if (!readyResult.ok) return readyResult;
    return batchResult;
  }, [catalog, effectiveBatchDefs, readyByBox, workingLines]);

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

    const weightByBox = new Map<number, number>();
    for (const line of sheetLines) {
      const raw = cartonWeights[line.boxNo]?.trim();
      if (!raw) continue;
      const n = Number(raw);
      if (Number.isFinite(n) && n > 0) weightByBox.set(line.boxNo, n);
    }
    const weightValidation = validateAllSheetCartonWeights(sheetLines, weightByBox, catalog);
    if (!weightValidation.ok) {
      setSaving(false);
      const firstKey = Object.keys(weightValidation.errors).sort()[0];
      setError(
        firstKey ? weightValidation.errors[firstKey] : "Carton weight is outside the allowed tolerance.",
      );
      return;
    }

    const cartonWeightPayload = sheetLines
      .filter((line) => weightByBox.has(line.boxNo))
      .map((line) => ({
        boxNo: line.boxNo,
        cartonWeightKg: weightByBox.get(line.boxNo)!,
      }));

    const assignments = sheetLines.map((line) => {
      if (lineHasComponentBatches(line, catalog)) {
        const parts = resolveLineParts(line, catalog);
        return {
          boxNo: line.boxNo,
          componentBatches: parts.map((part) => ({
            productName: part.productName,
            batchNo: componentBatches[line.boxNo]?.[part.productName] ?? "",
          })),
        };
      }
      return {
        boxNo: line.boxNo,
        batchNo: batches[line.boxNo] ?? "",
      };
    });

    const batchRes = await fetch(`/api/orders/${orderId}/batch-assignments`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignments, cartonWeights: cartonWeightPayload }),
    });

    if (!batchRes.ok) {
      const data = (await batchRes.json().catch(() => ({}))) as {
        error?: string;
        errors?: Record<string, string>;
      };
      setSaving(false);
      if (data.errors) {
        const first = Object.values(data.errors)[0];
        setError(first ?? "Carton weight validation failed");
      } else {
        setError(data.error ?? "Batch assignment failed");
      }
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
  }, [
    batches,
    cartonWeights,
    componentBatches,
    catalog,
    dispatch,
    dispatchTripId,
    orderId,
    router,
    sheetLines,
    sheetUrl,
    validation,
  ]);

  const cartonLabel = useMemo(
    () => `${sheetLines.length} carton${sheetLines.length !== 1 ? "s" : ""}`,
    [sheetLines.length],
  );

  const printableCartonLabels = useMemo(
    () => cartonLabelsFromSheetLines(sheetLines),
    [sheetLines],
  );

  const showDispatchInputs =
    dispatchEditMode && canEditDispatch && (!batchesLocked || !weightsVerified);
  const onTrip = Boolean(dispatchTripId);
  const showVehicleInputs = showDispatchInputs && !onTrip && !batchesLocked;
  const showBatchInputs = showDispatchInputs && !batchesLocked;
  const showWeightInputs = showDispatchInputs;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={backHref} className="text-sm font-medium text-zinc-700 underline">
          ← Back
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {canEditDispatch && !dispatchEditMode && (!batchesLocked || !weightsVerified) ? (
            <Link
              href={dispatchUrl}
              className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-zinc-900 shadow-sm ring-1 ring-zinc-200"
            >
              {batchesLocked ? "Enter carton weights" : "Edit dispatch"}
            </Link>
          ) : null}
          {batchesLocked ? (
            <span className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800 ring-1 ring-emerald-200">
              Batches assigned
            </span>
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
                {saving ? "Saving…" : batchesLocked ? "Save weights" : "Save dispatch"}
              </button>
            </>
          ) : null}
          <PrintCartonLabelsButton
            poNumber={poNumber}
            customerName={customerName}
            labels={printableCartonLabels}
          />
          <PrintSheetButton />
        </div>
      </div>

      {readyStockNeeds.length > 0 ? <ReadyStockCheck needs={readyStockNeeds} /> : null}

      {!validation.ok && showBatchInputs ? (
        <p className="text-sm text-red-700 print:hidden">{validation.error}</p>
      ) : null}
      {error ? <p className="text-sm text-red-700 print:hidden">{error}</p> : null}
      {saved && savedMessage ? (
        <p className="text-sm text-emerald-700 print:hidden">{savedMessage}</p>
      ) : null}

      {batchesLocked && !weightsVerified ? (
        <p className="text-sm text-emerald-800 print:hidden">
          Batches are assigned. Enter <strong>Carton wt (kg)</strong> for each box, then save — required
          before Zaman can release at the gate.
        </p>
      ) : batchesLocked ? (
        <p className="text-sm text-emerald-800 print:hidden">
          All batches and carton weights are complete. Use View / print only.
        </p>
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
      {canEditDispatch && dispatchReadyForGate && !weightsVerified ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 print:hidden">
          Weigh each carton on the scale and enter <strong>Carton wt (kg)</strong> below before Zaman can
          release this load at the gate. Standard weights allow ±8% tolerance.
        </p>
      ) : null}
      {canEditDispatch && weightsVerified ? (
        <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-900 print:hidden">
          Carton weights verified — this order can appear on Zaman&apos;s gate list.
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
                <th className="border border-black px-1 py-2 font-semibold">Carton wt (kg)</th>
                <th className="border border-black px-1 py-2 font-semibold">PO NO</th>
                <th className="border border-black px-1 py-2 font-semibold">Customer Co</th>
              </tr>
            </thead>
            <tbody>
              {sheetLines.map((row) => {
                const multiBatch = lineHasComponentBatches(row, catalog);
                const parts = multiBatch ? resolveLineParts(row, catalog) : [];
                const rowNeedsBatch = lineNeedsBatch(row, readyByBox, catalog);
                const lineSplit = readyByBox.get(row.boxNo);
                const resolvedComponentBatches = parts.map((part) => ({
                  productName: part.productName,
                  batchNo: componentBatches[row.boxNo]?.[part.productName] ?? "",
                }));
                const batchValue = formatReadyAwareBatchDisplay(
                  {
                    ...row,
                    batchNo: batches[row.boxNo] ?? row.batchNo ?? "",
                    componentBatches: resolvedComponentBatches,
                  },
                  catalog,
                  readyByBox,
                  batches[row.boxNo] ?? row.batchNo ?? "",
                  resolvedComponentBatches,
                );
                const displayWeight =
                  catalogWeights.get(row.boxNo) ?? row.weight ?? null;
                const standardKg = lookupStandardCartonWeight(
                  row.productName,
                  row.bottlesPerBox,
                  catalog,
                );
                const cartonWeightRaw = cartonWeights[row.boxNo] ?? "";
                const cartonWeightTrimmed = cartonWeightRaw.trim();
                const cartonWeightNum = cartonWeightTrimmed ? Number(cartonWeightTrimmed) : null;
                let cartonWeightError: string | null = null;
                if (showWeightInputs && cartonWeightTrimmed) {
                  if (
                    cartonWeightNum == null ||
                    !Number.isFinite(cartonWeightNum) ||
                    cartonWeightNum <= 0
                  ) {
                    cartonWeightError = "Enter a valid weight in kg.";
                  } else {
                    const check = validateSheetLineCartonWeight(row, catalog, cartonWeightNum);
                    if (!check.ok) cartonWeightError = check.error;
                  }
                }
                const displayCartonKg =
                  row.cartonWeightKg != null && !showWeightInputs
                    ? formatKg(row.cartonWeightKg)
                    : cartonWeightRaw;

                return (
                  <tr key={row.boxNo}>
                    <td className="border border-black px-1 py-1 text-center">{row.boxNo}</td>
                    <td className="border border-black px-1 py-1">
                      <div>{row.productName}</div>
                      {isMixedSampleLine(row) && row.mixedContents?.length ? (
                        <ul className="mt-1 list-none text-[10px] text-zinc-700 print:text-[9px]">
                          {row.mixedContents.map((c) => (
                            <li key={c.productName}>
                              {c.productName} × {c.bottles}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </td>
                    <td className="border border-black px-1 py-1 text-center">{row.bottlesPerBox}</td>
                    <td className="border border-black px-1 py-1 text-center">
                      {showBatchInputs ? (
                        <div className="space-y-1">
                          {multiBatch && !rowNeedsBatch && lineSplit && lineSplit.bottlesFromReady > 0 ? (
                            <span className="text-xs font-medium text-emerald-800 print:hidden">
                              {lineSplit.readyBatchDisplay || READY_SHELF_LABEL}
                            </span>
                          ) : multiBatch ? (
                            parts.map((part) => {
                              const partNeedsBatch = componentNeedsBatch(
                                row,
                                part.productName,
                                readyByBox,
                                catalog,
                              );
                              const compSplit = lineSplit?.components?.find((c) =>
                                productsMatch(c.productName, part.productName, catalog),
                              );
                              const options = batchesForRow(part.productName);
                              const value = componentBatches[row.boxNo]?.[part.productName] ?? "";
                              return (
                                <div key={part.productName} className="text-left">
                                  <div className="text-[10px] font-medium text-zinc-600 print:hidden">
                                    {part.productName}
                                    {compSplit && compSplit.bottlesFromReady > 0 ? (
                                      <span className="text-emerald-700">
                                        {" "}
                                        · {compSplit.bottlesFromReady} ready
                                      </span>
                                    ) : null}
                                  </div>
                                  {partNeedsBatch ? (
                                    <select
                                      value={value}
                                      onChange={(e) => {
                                        setSaved(false);
                                        setError(null);
                                        setComponentBatches((prev) => ({
                                          ...prev,
                                          [row.boxNo]: {
                                            ...(prev[row.boxNo] ?? {}),
                                            [part.productName]: e.target.value,
                                          },
                                        }));
                                      }}
                                      className="w-full min-w-[5rem] rounded border border-zinc-300 px-1 py-0.5 text-center text-sm print:hidden"
                                    >
                                      <option value="">— assign QC batch</option>
                                      {options.map((pb) => {
                                        const key = normalizeBatchNo(pb.batchNo).toLowerCase();
                                        const elsewhere = usedElsewhereMap.get(key) ?? 0;
                                        const onThisOrder = currentOrderUsedByBatch.get(key) ?? 0;
                                        const remaining = Math.max(
                                          0,
                                          pb.totalLiters - elsewhere - onThisOrder,
                                        );
                                        return (
                                          <option key={pb.batchNo} value={pb.batchNo}>
                                            {pb.batchNo} ({formatLiters(remaining)} L left)
                                          </option>
                                        );
                                      })}
                                    </select>
                                  ) : (
                                    <span className="text-xs text-emerald-800 print:hidden">
                                      {compSplit?.readyBatchDisplay || READY_SHELF_LABEL}
                                    </span>
                                  )}
                                </div>
                              );
                            })
                          ) : rowNeedsBatch ? (
                            <>
                              {lineSplit && lineSplit.bottlesFromReady > 0 ? (
                                <p className="text-[10px] text-emerald-700 print:hidden">
                                  {lineSplit.bottlesFromReady} from ready shelf on earlier cartons
                                </p>
                              ) : null}
                              <select
                                value={batches[row.boxNo] ?? ""}
                                onChange={(e) => {
                                  setSaved(false);
                                  setError(null);
                                  setBatches((prev) => ({ ...prev, [row.boxNo]: e.target.value }));
                                }}
                                className="w-full min-w-[5rem] rounded border border-zinc-300 px-1 py-0.5 text-center text-sm print:hidden"
                              >
                                <option value="">— assign QC batch</option>
                                {batchesForRow(row.productName).map((pb) => {
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
                            </>
                          ) : (
                            <span className="text-xs font-medium text-emerald-800 print:hidden">
                              {lineSplit?.readyBatchDisplay || READY_SHELF_LABEL}
                            </span>
                          )}
                          <span className="hidden print:inline">{batchValue}</span>
                        </div>
                      ) : (
                        batchValue
                      )}
                    </td>
                    <td className="border border-black px-1 py-1 text-center">
                      {weightCell(displayWeight)}
                    </td>
                    <td className="border border-black px-1 py-1 text-center">
                      {showWeightInputs ? (
                        <div className="space-y-0.5 print:hidden">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={cartonWeightRaw}
                            placeholder={standardKg != null ? String(standardKg) : ""}
                            onChange={(e) => {
                              setSaved(false);
                              setError(null);
                              setCartonWeights((prev) => ({
                                ...prev,
                                [row.boxNo]: e.target.value,
                              }));
                            }}
                            className={`w-full min-w-[4rem] rounded border px-1 py-0.5 text-center text-sm ${
                              cartonWeightError ? "border-red-400" : "border-zinc-300"
                            }`}
                          />
                          {cartonWeightError ? (
                            <p className="text-[9px] text-red-700">{cartonWeightError}</p>
                          ) : null}
                        </div>
                      ) : (
                        displayCartonKg
                      )}
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

