"use client";

import Link from "next/link";
import { memo, useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { CartonWeightInput } from "@/components/CartonWeightInput";
import { PrintSheetButton } from "@/components/PrintSheetButton";
import type { CombinedTripOrder } from "@/components/CombinedTripLoadingSheet";
import {
  componentBatchStateKey,
  isBundleProduct,
  resolveBundleParts,
  resolveComponentBatchAtIndex,
  type PackingCatalogRow,
} from "@/lib/bundleCatalog";
import { type ProductionBatchPoolItem } from "@/lib/batchVolume";
import { isMixedSampleLine, resolveMixedSampleParts } from "@/lib/mixedSampleBox";
import {
  augmentPoolWithReadyBatches,
  batchPickerOptionsForComponent,
  buildStaticBatchPickerOptions,
  type ReadyLotLike,
} from "@/lib/readyBatchPool";
import {
  formatKg,
  lookupStandardCartonWeight,
  validateSheetLineCartonWeight,
} from "@/lib/standardCartonWeight";

type Props = {
  tripId: string;
  vehicleNo: string;
  driverName: string;
  tripDate: string;
  orders: CombinedTripOrder[];
  catalog: PackingCatalogRow[];
  productionBatches: ProductionBatchPoolItem[];
  readyBatchLots: ReadyLotLike[];
  usedLitersElsewhere?: Record<string, number>;
};

type LineModel = {
  orderId: string;
  poNumber: string;
  challanNo: string;
  line: CombinedTripOrder["lines"][number];
  lineKey: string;
  multiBatch: boolean;
  parts: Array<{ productName: string; bottlesPerUnit: number; litersPerBottle: number }>;
  standardKg: number | null;
};

type SelectOption = { batchNo: string; label: string };

function lineHasComponentBatches(
  line: CombinedTripOrder["lines"][number],
  catalog: PackingCatalogRow[],
): boolean {
  return isMixedSampleLine(line) || isBundleProduct(line.productName, catalog);
}

function resolveLineParts(line: CombinedTripOrder["lines"][number], catalog: PackingCatalogRow[]) {
  if (isMixedSampleLine(line)) return resolveMixedSampleParts(line, catalog);
  return resolveBundleParts(line.productName, catalog);
}

function lineComplete(
  line: CombinedTripOrder["lines"][number],
  lineKey: string,
  catalog: PackingCatalogRow[],
  batches: Record<string, string>,
  componentBatches: Record<string, Record<string, string>>,
): boolean {
  if (lineHasComponentBatches(line, catalog)) {
    const parts = resolveLineParts(line, catalog);
    return (
      parts.length > 0 &&
      parts.every((part, index) => {
        const key = componentBatchStateKey(parts, index);
        return Boolean(componentBatches[lineKey]?.[key]?.trim());
      })
    );
  }
  return Boolean(batches[lineKey]?.trim());
}

function orderLineStateKey(orderId: string, boxNo: number): string {
  return `${orderId}:${boxNo}`;
}

function buildBatchState(orders: CombinedTripOrder[]): Record<string, string> {
  const initial: Record<string, string> = {};
  for (const order of orders) {
    for (const line of order.lines) {
      initial[orderLineStateKey(order.id, line.boxNo)] = line.batchNo?.trim() ?? "";
    }
  }
  return initial;
}

function buildComponentBatchState(
  orders: CombinedTripOrder[],
  catalog: PackingCatalogRow[],
): Record<string, Record<string, string>> {
  const initial: Record<string, Record<string, string>> = {};
  for (const order of orders) {
    for (const line of order.lines) {
      const lineKey = orderLineStateKey(order.id, line.boxNo);
      const map: Record<string, string> = {};
      if (lineHasComponentBatches(line, catalog)) {
        const parts = resolveLineParts(line, catalog);
        parts.forEach((part, index) => {
          const key = componentBatchStateKey(parts, index);
          const hit = resolveComponentBatchAtIndex(line, parts, index, catalog);
          map[key] = hit?.batchNo?.trim() ?? "";
        });
      }
      initial[lineKey] = map;
    }
  }
  return initial;
}

function buildCartonWeightState(orders: CombinedTripOrder[]): Record<string, string> {
  const initial: Record<string, string> = {};
  for (const order of orders) {
    for (const line of order.lines) {
      initial[orderLineStateKey(order.id, line.boxNo)] = formatKg(line.cartonWeightKg ?? null);
    }
  }
  return initial;
}

type AssignmentRowProps = {
  model: LineModel;
  batchValue: string;
  componentBatchMap: Record<string, string> | undefined;
  cartonWeight: string;
  staticOptionsByProduct: Map<string, SelectOption[]>;
  onBatchChange: (lineKey: string, value: string) => void;
  onComponentBatchChange: (lineKey: string, stateKey: string, value: string) => void;
  onWeightChange: (lineKey: string, value: string) => void;
};

const TripBatchAssignmentRow = memo(function TripBatchAssignmentRow({
  model,
  batchValue,
  componentBatchMap,
  cartonWeight,
  staticOptionsByProduct,
  onBatchChange,
  onComponentBatchChange,
  onWeightChange,
}: AssignmentRowProps) {
  const { line, lineKey, multiBatch, parts, standardKg, poNumber, challanNo } = model;

  return (
    <tr>
      <td className="border border-black px-1 py-1 text-center">{line.boxNo}</td>
      <td className="border border-black px-1 py-1">
        <div>{line.productName}</div>
        {isMixedSampleLine(line) && line.mixedContents?.length ? (
          <ul className="mt-1 list-none text-[10px] text-zinc-700 print:text-[9px]">
            {line.mixedContents.map((content) => (
              <li key={`${content.productName}-${content.bottles}`}>
                {content.productName} × {content.bottles}
              </li>
            ))}
          </ul>
        ) : null}
      </td>
      <td className="border border-black px-1 py-1 text-center">{line.bottlesPerBox}</td>
      <td className="border border-black px-1 py-1 text-center">
        {multiBatch ? (
          <div className="space-y-1">
            {parts.map((part, index) => {
              const stateKey = componentBatchStateKey(parts, index);
              const selectedBatchNo = componentBatchMap?.[stateKey] ?? "";
              const options = staticOptionsByProduct.get(part.productName) ?? [];
              return (
                <div key={stateKey} className="text-left">
                  <div className="text-[10px] font-medium text-zinc-600 print:hidden">
                    {part.productName}
                  </div>
                  <select
                    value={selectedBatchNo}
                    onChange={(e) => onComponentBatchChange(lineKey, stateKey, e.target.value)}
                    className="w-full min-w-[7rem] rounded border border-zinc-300 px-1 py-0.5 text-center text-sm print:hidden"
                  >
                    <option value="">— assign batch</option>
                    {options.map((option) => (
                      <option key={option.batchNo} value={option.batchNo}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <span className="hidden print:inline">
                    {part.productName}: {componentBatchMap?.[stateKey] || "—"}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <>
            <select
              value={batchValue}
              onChange={(e) => onBatchChange(lineKey, e.target.value)}
              className="w-full min-w-[7rem] rounded border border-zinc-300 px-1 py-0.5 text-center text-sm print:hidden"
            >
              <option value="">— assign batch</option>
              {(staticOptionsByProduct.get(line.productName) ?? []).map((option) => (
                <option key={option.batchNo} value={option.batchNo}>
                  {option.label}
                </option>
              ))}
            </select>
            <span className="hidden print:inline">{batchValue || "—"}</span>
          </>
        )}
      </td>
      <td className="border border-black px-1 py-1 text-center">
        <CartonWeightInput
          value={cartonWeight}
          placeholder={standardKg != null ? String(standardKg) : ""}
          standardKg={standardKg}
          onValueChange={(next) => onWeightChange(lineKey, next)}
          className="w-full min-w-[4rem] rounded border border-zinc-300 px-1 py-0.5 text-center text-sm print:hidden"
          errorClassName="w-full min-w-[4rem] rounded border border-red-500 px-1 py-0.5 text-center text-sm print:hidden"
        />
        <span className="hidden print:inline">{cartonWeight}</span>
      </td>
      <td className="border border-black px-1 py-1 text-center">{poNumber}</td>
      <td className="border border-black px-1 py-1 text-center">{challanNo}</td>
    </tr>
  );
});

export function TripBatchAssignmentSheet({
  tripId,
  vehicleNo,
  driverName,
  tripDate,
  orders,
  catalog,
  productionBatches,
  readyBatchLots,
}: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [batches, setBatches] = useState<Record<string, string>>(() => buildBatchState(orders));
  const [componentBatches, setComponentBatches] = useState<Record<string, Record<string, string>>>(() =>
    buildComponentBatchState(orders, catalog),
  );
  const [cartonWeights, setCartonWeights] = useState<Record<string, string>>(() =>
    buildCartonWeightState(orders),
  );
  const cartonWeightsRef = useRef(cartonWeights);
  cartonWeightsRef.current = cartonWeights;

  const ordersSnapshot = useMemo(
    () =>
      JSON.stringify(
        orders.map((order) => ({
          id: order.id,
          lines: order.lines.map((line) => ({
            boxNo: line.boxNo,
            batchNo: line.batchNo ?? "",
            componentBatches: line.componentBatches ?? [],
            cartonWeightKg: line.cartonWeightKg ?? null,
          })),
        })),
      ),
    [orders],
  );

  useEffect(() => {
    setBatches(buildBatchState(orders));
    setComponentBatches(buildComponentBatchState(orders, catalog));
    setCartonWeights(buildCartonWeightState(orders));
  }, [catalog, orders, ordersSnapshot]);

  const progress = useMemo(() => {
    let complete = 0;
    let total = 0;
    for (const order of orders) {
      for (const line of order.lines) {
        total += 1;
        const key = orderLineStateKey(order.id, line.boxNo);
        if (lineComplete(line, key, catalog, batches, componentBatches)) complete += 1;
      }
    }
    return { complete, total, fullyAssigned: total > 0 && complete === total };
  }, [batches, catalog, componentBatches, orders]);

  const poList = useMemo(() => orders.map((order) => order.poNumber).join(", "), [orders]);
  const batchPrintLog = useMemo(
    () => ({
      documentType: "trip_batch_assignment" as const,
      documentTitle: `Trip batch sheet — ${vehicleNo}`,
      referenceId: tripId,
      referencePath: `/dispatch/trips/${tripId}/loading-sheet?dispatch=1`,
      metadata: { vehicleNo, poList, tripDate },
    }),
    [tripId, vehicleNo, poList, tripDate],
  );

  const augmentedProductionBatches = useMemo(
    () => augmentPoolWithReadyBatches(productionBatches, readyBatchLots, catalog),
    [catalog, productionBatches, readyBatchLots],
  );

  const lineModels = useMemo(() => {
    const models: LineModel[] = [];
    for (const order of orders) {
      for (const line of order.lines) {
        const multiBatch = lineHasComponentBatches(line, catalog);
        const parts = multiBatch ? resolveLineParts(line, catalog) : [];
        models.push({
          orderId: order.id,
          poNumber: order.poNumber,
          challanNo: order.challanNo,
          line,
          lineKey: orderLineStateKey(order.id, line.boxNo),
          multiBatch,
          parts,
          standardKg: lookupStandardCartonWeight(line.productName, line.bottlesPerBox, catalog),
        });
      }
    }
    return models;
  }, [catalog, orders]);

  const staticOptionsByProduct = useMemo(() => {
    const map = new Map<string, SelectOption[]>();
    for (const model of lineModels) {
      const names = model.multiBatch
        ? model.parts.map((part) => part.productName)
        : [model.line.productName];
      for (const name of names) {
        if (!map.has(name)) {
          map.set(
            name,
            buildStaticBatchPickerOptions(
              batchPickerOptionsForComponent(name, augmentedProductionBatches, readyBatchLots, catalog),
            ),
          );
        }
      }
    }
    return map;
  }, [augmentedProductionBatches, catalog, lineModels, readyBatchLots]);

  const onBatchChange = useCallback((lineKey: string, value: string) => {
    startTransition(() => {
      setBatches((prev) => ({ ...prev, [lineKey]: value }));
    });
  }, []);

  const onComponentBatchChange = useCallback((lineKey: string, stateKey: string, value: string) => {
    startTransition(() => {
      setComponentBatches((prev) => ({
        ...prev,
        [lineKey]: {
          ...(prev[lineKey] ?? {}),
          [stateKey]: value,
        },
      }));
    });
  }, []);

  const onWeightChange = useCallback((lineKey: string, value: string) => {
    setCartonWeights((prev) => {
      const next = { ...prev, [lineKey]: value };
      cartonWeightsRef.current = next;
      return next;
    });
  }, []);

  const modelsByOrder = useMemo(() => {
    const grouped = new Map<string, { order: CombinedTripOrder; models: LineModel[] }>();
    for (const order of orders) {
      grouped.set(order.id, { order, models: [] });
    }
    for (const model of lineModels) {
      grouped.get(model.orderId)?.models.push(model);
    }
    return [...grouped.values()];
  }, [lineModels, orders]);

  const saveProgress = async () => {
    (document.activeElement as HTMLElement | null)?.blur?.();
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });

    const latestWeights = cartonWeightsRef.current;

    setSaving(true);
    setError(null);
    setMessage(null);

    const assignments = orders.flatMap((order) =>
      order.lines.map((line) => {
        const key = orderLineStateKey(order.id, line.boxNo);
        if (lineHasComponentBatches(line, catalog)) {
          const parts = resolveLineParts(line, catalog);
          return {
            orderId: order.id,
            boxNo: line.boxNo,
            componentBatches: parts.map((part, index) => ({
              productName: part.productName,
              batchNo: componentBatches[key]?.[componentBatchStateKey(parts, index)] ?? "",
            })),
          };
        }
        return {
          orderId: order.id,
          boxNo: line.boxNo,
          batchNo: batches[key] ?? "",
        };
      }),
    );

    const weights = orders.flatMap((order) =>
      order.lines
        .map((line) => {
          const raw = latestWeights[orderLineStateKey(order.id, line.boxNo)]?.trim();
          const kg = raw ? Number(raw) : null;
          return kg != null && Number.isFinite(kg) && kg > 0
            ? { orderId: order.id, boxNo: line.boxNo, cartonWeightKg: kg }
            : null;
        })
        .filter((row): row is { orderId: string; boxNo: number; cartonWeightKg: number } => Boolean(row)),
    );

    for (const order of orders) {
      const orderWeightByBox = new Map<number, number>();
      for (const line of order.lines) {
        const raw = latestWeights[orderLineStateKey(order.id, line.boxNo)]?.trim();
        if (!raw) continue;
        const kg = Number(raw);
        if (Number.isFinite(kg) && kg > 0) orderWeightByBox.set(line.boxNo, kg);
      }
      if (orderWeightByBox.size === 0) continue;
      const errors: Record<string, string> = {};
      for (const line of order.lines) {
        const kg = orderWeightByBox.get(line.boxNo);
        if (kg == null) continue;
        const result = validateSheetLineCartonWeight(line, catalog, kg);
        if (!result.ok) errors[`box.${line.boxNo}`] = result.error;
      }
      if (Object.keys(errors).length > 0) {
        setSaving(false);
        const firstKey = Object.keys(errors).sort()[0];
        setError(`PO ${order.poNumber}: ${errors[firstKey]}`);
        return;
      }
    }

    const res = await fetch(`/api/dispatch-trips/${tripId}/batch-assignments`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignments, cartonWeights: weights }),
    });

    setSaving(false);

    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      errors?: Record<string, string>;
      completeLines?: number;
      totalLines?: number;
      fullyAssigned?: boolean;
    };

    if (!res.ok) {
      setError(data.errors ? Object.values(data.errors)[0] : data.error ?? "Could not save trip batches.");
      return;
    }

    const complete = data.completeLines ?? progress.complete;
    const total = data.totalLines ?? progress.total;
    setMessage(
      data.fullyAssigned
        ? "All batch entries are saved. Enter/verify carton weights for every PO before gate release."
        : `Saved partial work: ${complete}/${total} carton rows have batch entries. You can finish the rest later.`,
    );
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/dispatch/trips/${tripId}`} className="text-sm font-medium text-zinc-700 underline">
          ← Back to trip
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {progress.fullyAssigned ? <PrintSheetButton printLog={batchPrintLog} /> : null}
          <button
            type="button"
            onClick={saveProgress}
            disabled={saving}
            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save progress"}
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 print:hidden">
        Rashid can save half-done work here. Zaman&apos;s gate portal will not show this vehicle until all
        required batch entries and carton weights are complete.
      </div>
      {message ? <p className="text-sm text-emerald-700 print:hidden">{message}</p> : null}
      {error ? <p className="text-sm text-red-700 print:hidden">{error}</p> : null}

      <div className="rounded-xl border border-zinc-900 bg-white p-4 text-black shadow-sm print:border-0 print:p-2 print:shadow-none">
        <div className="mb-4">
          <h1 className="text-center text-lg font-semibold uppercase tracking-wide print:text-base">
            Vehicle loading sheet batch assignment
          </h1>
          <p className="mt-1 text-center text-xs text-zinc-600 print:text-[10px] print:text-black">
            Vehicle {vehicleNo || "—"} · Driver {driverName || "—"} · Date {tripDate || "—"} ·{" "}
            {progress.complete}/{progress.total} cartons assigned
          </p>
        </div>

        <div className="space-y-6">
          {modelsByOrder.map(({ order, models }) => (
            <section key={order.id} className="break-inside-avoid">
              <div className="mb-2 rounded-lg bg-zinc-100 px-3 py-2 text-sm font-semibold text-zinc-900 print:bg-transparent print:px-0">
                PO {order.poNumber} — {order.customerName}
                {order.challanNo ? ` · Challan ${order.challanNo}` : ""}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-black text-sm print:text-[10px]">
                  <thead>
                    <tr className="bg-zinc-100 print:bg-transparent">
                      <th className="border border-black px-1 py-2 font-semibold">Box No</th>
                      <th className="border border-black px-1 py-2 font-semibold">PRODUCT NAME</th>
                      <th className="border border-black px-1 py-2 font-semibold">NO OF BOTTLES</th>
                      <th className="border border-black px-1 py-2 font-semibold">Batch No</th>
                      <th className="border border-black px-1 py-2 font-semibold">Carton wt (kg)</th>
                      <th className="border border-black px-1 py-2 font-semibold">PO NO</th>
                      <th className="border border-black px-1 py-2 font-semibold">Challan / DC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {models.map((model) => (
                      <TripBatchAssignmentRow
                        key={model.lineKey}
                        model={model}
                        batchValue={batches[model.lineKey] ?? ""}
                        componentBatchMap={componentBatches[model.lineKey]}
                        cartonWeight={cartonWeights[model.lineKey] ?? ""}
                        staticOptionsByProduct={staticOptionsByProduct}
                        onBatchChange={onBatchChange}
                        onComponentBatchChange={onComponentBatchChange}
                        onWeightChange={onWeightChange}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
