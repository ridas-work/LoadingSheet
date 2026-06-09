"use client";

import { useCallback, useEffect, useState } from "react";

import { computeWasteLiters } from "@/lib/batchFillingWaste";
import { roundLiters } from "@/lib/batchVolume";

export type PackingOption = {
  code: string;
  name: string;
  litersPerBottle: number;
  batchFamily: string;
};

export type PackingLineData = {
  productCode: string;
  productName: string;
  litersPerBottle: number;
  filledBottlesToday: number;
  readyToDeliverBottles: number;
  filledLitersTodaySnapshot: number;
  readyToDeliverLitersSnapshot: number;
};

export type EntryData = {
  filledLitersToday: number;
  readyToDeliverLiters: number;
  packingLines: PackingLineData[];
  legacyLitersOnly?: boolean;
  physicalRemainingLiters: number;
  systemRemainingLiters: number;
  wasteLiters: number;
  note: string;
};

export type FillingRow = {
  batchNo: string;
  productName: string;
  totalLiters: number;
  usedLiters: number;
  systemRemainingLiters: number;
  status: string;
  packingOptions: PackingOption[];
  entry: EntryData | null;
};

type PackingLineState = {
  id: string;
  productCode: string;
  filledBottlesToday: string;
  readyToDeliverBottles: string;
};

type RowState = {
  packingLines: PackingLineState[];
  physicalRemainingLiters: string;
};

type SaveStatus = "idle" | "saving" | "saved" | "error";

type Props = {
  date: string;
  initialRows: FillingRow[];
  readOnly?: boolean;
};

const inputClass =
  "w-full min-w-[4rem] rounded border border-zinc-200 bg-white px-2 py-1 text-right text-sm tabular-nums focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-300";
const selectClass =
  "w-full min-w-[13rem] rounded border border-zinc-200 bg-white px-2 py-1 text-sm focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-300";

function fmtL(n: number) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function fmtInt(n: number) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function rid() {
  return Math.random().toString(36).slice(2, 10);
}

function emptyPackingLine(row: FillingRow): PackingLineState {
  return {
    id: rid(),
    productCode: row.packingOptions.length === 1 ? row.packingOptions[0]!.code : "",
    filledBottlesToday: "",
    readyToDeliverBottles: "",
  };
}

function initState(row: FillingRow): RowState {
  const lines = row.entry?.packingLines?.length
    ? row.entry.packingLines.map((line) => ({
        id: rid(),
        productCode: line.productCode,
        filledBottlesToday: String(line.filledBottlesToday),
        readyToDeliverBottles: String(line.readyToDeliverBottles),
      }))
    : [emptyPackingLine(row)];

  return {
    packingLines: lines,
    physicalRemainingLiters: row.entry ? String(row.entry.physicalRemainingLiters) : "",
  };
}

function statesEqual(a: RowState, b: RowState) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function parseBottleText(value: string): number | null {
  if (!value.trim()) return 0;
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 ? n : null;
}

function optionFor(row: FillingRow, productCode: string): PackingOption | null {
  return row.packingOptions.find((option) => option.code === productCode) ?? null;
}

function lineSnapshots(row: FillingRow, line: PackingLineState) {
  const option = optionFor(row, line.productCode);
  const filledBottles = parseBottleText(line.filledBottlesToday);
  const readyBottles = parseBottleText(line.readyToDeliverBottles);
  if (!option || filledBottles === null || readyBottles === null) {
    return { filledLiters: 0, readyLiters: 0, valid: false };
  }
  return {
    filledLiters: roundLiters(filledBottles * option.litersPerBottle),
    readyLiters: roundLiters(readyBottles * option.litersPerBottle),
    valid: true,
  };
}

function rowSnapshotTotals(row: FillingRow, state: RowState) {
  return state.packingLines.reduce(
    (totals, line) => {
      const snapshots = lineSnapshots(row, line);
      return {
        filledLiters: roundLiters(totals.filledLiters + snapshots.filledLiters),
        readyLiters: roundLiters(totals.readyLiters + snapshots.readyLiters),
      };
    },
    { filledLiters: 0, readyLiters: 0 },
  );
}

export function BatchFillingGrid({ date, initialRows, readOnly }: Props) {
  const [rows] = useState<FillingRow[]>(initialRows);
  const [states, setStates] = useState<Record<string, RowState>>({});
  const [baseline, setBaseline] = useState<Record<string, RowState>>({});
  const [saveStatus, setSaveStatus] = useState<Record<string, SaveStatus>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [liveSystem, setLiveSystem] = useState<Record<string, number>>({});

  useEffect(() => {
    const next: Record<string, RowState> = {};
    const sys: Record<string, number> = {};
    for (const row of rows) {
      next[row.batchNo] = initState(row);
      sys[row.batchNo] = row.systemRemainingLiters;
    }
    setStates(next);
    setBaseline(next);
    setLiveSystem(sys);
  }, [rows]);

  function markDirty(batchNo: string) {
    setSaveStatus((s) => {
      if (s[batchNo] === "saved" || s[batchNo] === "error") return { ...s, [batchNo]: "idle" };
      return s;
    });
  }

  function updatePhysical(batchNo: string, value: string) {
    setStates((prev) => ({ ...prev, [batchNo]: { ...prev[batchNo]!, physicalRemainingLiters: value } }));
    markDirty(batchNo);
  }

  function updatePackingLine(
    batchNo: string,
    lineId: string,
    patch: Partial<Omit<PackingLineState, "id">>,
  ) {
    setStates((prev) => {
      const current = prev[batchNo];
      if (!current) return prev;
      return {
        ...prev,
        [batchNo]: {
          ...current,
          packingLines: current.packingLines.map((line) =>
            line.id === lineId ? { ...line, ...patch } : line,
          ),
        },
      };
    });
    markDirty(batchNo);
  }

  function addPackingLine(row: FillingRow) {
    setStates((prev) => {
      const current = prev[row.batchNo];
      if (!current) return prev;
      return {
        ...prev,
        [row.batchNo]: {
          ...current,
          packingLines: [...current.packingLines, emptyPackingLine(row)],
        },
      };
    });
    markDirty(row.batchNo);
  }

  function removePackingLine(row: FillingRow, lineId: string) {
    setStates((prev) => {
      const current = prev[row.batchNo];
      if (!current) return prev;
      const nextLines = current.packingLines.filter((line) => line.id !== lineId);
      return {
        ...prev,
        [row.batchNo]: {
          ...current,
          packingLines: nextLines.length > 0 ? nextLines : [emptyPackingLine(row)],
        },
      };
    });
    markDirty(row.batchNo);
  }

  const save = useCallback(
    async (batchNo: string) => {
      if (readOnly) return;
      const row = rows.find((candidate) => candidate.batchNo === batchNo);
      const current = states[batchNo];
      const base = baseline[batchNo];
      if (!row || !current || !base || statesEqual(current, base)) return;

      const physical =
        current.physicalRemainingLiters === "" ? 0 : Number(current.physicalRemainingLiters);

      if (!Number.isFinite(physical) || physical < 0) {
        setSaveStatus((s) => ({ ...s, [batchNo]: "error" }));
        setErrors((e) => ({ ...e, [batchNo]: "Physical remaining must be a number ≥ 0" }));
        return;
      }

      const packingLines = [];
      for (const line of current.packingLines) {
        const filled = parseBottleText(line.filledBottlesToday);
        const ready = parseBottleText(line.readyToDeliverBottles);
        if (filled === null || ready === null) {
          setSaveStatus((s) => ({ ...s, [batchNo]: "error" }));
          setErrors((e) => ({ ...e, [batchNo]: "Bottle counts must be whole numbers ≥ 0" }));
          return;
        }
        if (!line.productCode && filled === 0 && ready === 0) continue;
        if (!line.productCode) {
          setSaveStatus((s) => ({ ...s, [batchNo]: "error" }));
          setErrors((e) => ({ ...e, [batchNo]: "Select a product/packing before entering bottles" }));
          return;
        }
        if (!optionFor(row, line.productCode)) {
          setSaveStatus((s) => ({ ...s, [batchNo]: "error" }));
          setErrors((e) => ({ ...e, [batchNo]: "Selected product is not valid for this batch" }));
          return;
        }
        if (filled === 0 && ready === 0) continue;
        packingLines.push({
          productCode: line.productCode,
          filledBottlesToday: filled,
          readyToDeliverBottles: ready,
        });
      }

      setSaveStatus((s) => ({ ...s, [batchNo]: "saving" }));
      setErrors((e) => { const next = { ...e }; delete next[batchNo]; return next; });

      const res = await fetch("/api/batch-filling", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchNo,
          entryDate: date,
          packingLines,
          physicalRemainingLiters: roundLiters(physical),
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setSaveStatus((s) => ({ ...s, [batchNo]: "error" }));
        setErrors((e) => ({ ...e, [batchNo]: data.error ?? "Save failed" }));
        return;
      }

      const data = (await res.json()) as { entry: EntryData };
      const synced: RowState = initState({ ...row, entry: data.entry });
      setStates((prev) => ({ ...prev, [batchNo]: synced }));
      setBaseline((prev) => ({ ...prev, [batchNo]: synced }));
      setLiveSystem((prev) => ({ ...prev, [batchNo]: data.entry.systemRemainingLiters }));
      setSaveStatus((s) => ({ ...s, [batchNo]: "saved" }));
      setTimeout(() => {
        setSaveStatus((s) => (s[batchNo] === "saved" ? { ...s, [batchNo]: "idle" } : s));
      }, 1500);
    },
    [readOnly, rows, states, baseline, date],
  );

  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-600">
        No active batches. QC registers batches in Production.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
      {!readOnly ? (
        <p className="border-b border-zinc-100 bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
          Enter bottle counts by product/packing. <strong>Ready to deliver</strong> adds to the ready stock pool when saved (fully
          finished: capped, labeled/stickered, packed, and ready to leave with dispatch). Save each batch after editing.
          Variance stays in liters using product bottle sizes.
        </p>
      ) : null}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[72rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs text-zinc-600">
              <th className="min-w-[12rem] px-3 py-2.5 font-semibold text-zinc-800">Batch / Product</th>
              <th className="w-28 px-3 py-2.5 text-right font-semibold">
                QC remaining (L)
                <div className="font-normal text-zinc-500">(system)</div>
              </th>
              <th className="px-3 py-2.5 font-semibold" colSpan={2}>
                Filling table (bottles)
                <div className="font-normal text-zinc-500">product / filled / ready</div>
              </th>
              <th className="w-28 px-3 py-2.5 text-right font-semibold">Physical remaining (L)</th>
              <th className="w-28 px-3 py-2.5 text-right font-semibold text-zinc-900">
                Variance / waste (L)
              </th>
              {!readOnly ? <th className="w-16 px-2 py-2.5" /> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const state = states[row.batchNo];
              if (!state) return null;
              const sysRemaining = liveSystem[row.batchNo] ?? row.systemRemainingLiters;

              const derivedTotals = row.entry?.legacyLitersOnly
                ? {
                    filledLiters: row.entry.filledLitersToday,
                    readyLiters: row.entry.readyToDeliverLiters,
                  }
                : rowSnapshotTotals(row, state);
              const physicalNum =
                state.physicalRemainingLiters === ""
                  ? 0
                  : Number(state.physicalRemainingLiters);
              const linesValid = state.packingLines.every((line) => {
                const filled = parseBottleText(line.filledBottlesToday);
                const ready = parseBottleText(line.readyToDeliverBottles);
                return filled !== null && ready !== null && (!line.productCode || optionFor(row, line.productCode));
              });
              const numsValid = Number.isFinite(physicalNum) && physicalNum >= 0 && linesValid;
              const liveVariance =
                state.physicalRemainingLiters !== "" && numsValid
                  ? computeWasteLiters(sysRemaining, derivedTotals.filledLiters, derivedTotals.readyLiters, physicalNum)
                  : null;

              const rowStatus = saveStatus[row.batchNo] ?? "idle";
              const rowError = errors[row.batchNo];

              return (
                <tr key={row.batchNo} className="border-b border-zinc-100">
                  <td className="px-3 py-1.5">
                    <div className="font-medium text-zinc-900">{row.batchNo}</div>
                    <div className="text-xs text-zinc-500">{row.productName}</div>
                    {rowError ? (
                      <div className="text-[11px] text-red-600">{rowError}</div>
                    ) : null}
                  </td>

                  {/* Nimra system remaining — always read-only */}
                  <td className="px-3 py-1.5 text-right tabular-nums text-zinc-700">
                    {fmtL(sysRemaining)}
                  </td>

                  <td className="px-2 py-1 align-top" colSpan={2}>
                    {readOnly ? (
                      <div className="space-y-1">
                        {row.entry?.packingLines?.length ? (
                          row.entry.packingLines.map((line, idx) => (
                            <div key={`${line.productCode}-${idx}`} className="rounded border border-zinc-100 bg-zinc-50 px-2 py-1">
                              <div className="font-medium text-zinc-800">{line.productName}</div>
                              <div className="text-xs text-zinc-600">
                                Filled {fmtInt(line.filledBottlesToday)} bottles ({fmtL(line.filledLitersTodaySnapshot)} L)
                                {" · "}
                                Ready {fmtInt(line.readyToDeliverBottles)} bottles ({fmtL(line.readyToDeliverLitersSnapshot)} L)
                              </div>
                            </div>
                          ))
                        ) : row.entry?.legacyLitersOnly ? (
                          <div className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-800">
                            Legacy entry: Filled {fmtL(row.entry.filledLitersToday)} L · Ready{" "}
                            {fmtL(row.entry.readyToDeliverLiters)} L
                          </div>
                        ) : (
                          <span className="text-xs text-zinc-400">No bottle rows recorded</span>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {row.packingOptions.length === 0 ? (
                          <div className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-800">
                            No catalog packing matches this batch product. Add or fix ProductPacking first.
                          </div>
                        ) : null}
                        <div className="rounded-lg border border-zinc-200">
                          <table className="w-full border-collapse text-xs">
                            <thead className="bg-zinc-50 text-zinc-500">
                              <tr>
                                <th className="px-2 py-1 text-left font-medium">Product / packing</th>
                                <th className="w-24 px-2 py-1 text-right font-medium">Filled bottles</th>
                                <th className="w-24 px-2 py-1 text-right font-medium">Ready bottles</th>
                                <th className="w-20 px-2 py-1 text-right font-medium">Liters</th>
                                <th className="w-8 px-1 py-1" />
                              </tr>
                            </thead>
                            <tbody>
                              {state.packingLines.map((line) => {
                                const snapshots = lineSnapshots(row, line);
                                return (
                                  <tr key={line.id} className="border-t border-zinc-100">
                                    <td className="px-1.5 py-1">
                                      <select
                                        className={selectClass}
                                        value={line.productCode}
                                        onChange={(e) =>
                                          updatePackingLine(row.batchNo, line.id, { productCode: e.target.value })
                                        }
                                      >
                                        <option value="">Select product…</option>
                                        {row.packingOptions.map((option) => (
                                          <option key={option.code} value={option.code}>
                                            {option.name} ({fmtL(option.litersPerBottle)} L)
                                          </option>
                                        ))}
                                      </select>
                                    </td>
                                    <td className="px-1.5 py-1">
                                      <input
                                        type="text"
                                        inputMode="numeric"
                                        className={inputClass}
                                        placeholder="0"
                                        value={line.filledBottlesToday}
                                        onChange={(e) =>
                                          updatePackingLine(row.batchNo, line.id, {
                                            filledBottlesToday: e.target.value,
                                          })
                                        }
                                      />
                                    </td>
                                    <td className="px-1.5 py-1">
                                      <input
                                        type="text"
                                        inputMode="numeric"
                                        className={inputClass}
                                        placeholder="0"
                                        value={line.readyToDeliverBottles}
                                        onChange={(e) =>
                                          updatePackingLine(row.batchNo, line.id, {
                                            readyToDeliverBottles: e.target.value,
                                          })
                                        }
                                      />
                                    </td>
                                    <td className="px-2 py-1 text-right tabular-nums text-zinc-500">
                                      {snapshots.valid
                                        ? `${fmtL(snapshots.filledLiters + snapshots.readyLiters)}`
                                        : "—"}
                                    </td>
                                    <td className="px-1 py-1 text-right">
                                      <button
                                        type="button"
                                        className="rounded border border-zinc-300 px-1.5 py-0.5 text-zinc-600 disabled:opacity-40"
                                        disabled={state.packingLines.length <= 1}
                                        onClick={() => removePackingLine(row, line.id)}
                                      >
                                        ×
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <button
                            type="button"
                            className="text-xs font-medium text-zinc-700 underline"
                            onClick={() => addPackingLine(row)}
                          >
                            + Add product row
                          </button>
                          <span className="text-xs text-zinc-500">
                            Filled {fmtL(derivedTotals.filledLiters)} L · Ready{" "}
                            {fmtL(derivedTotals.readyLiters)} L
                          </span>
                        </div>
                      </div>
                    )}
                  </td>

                  <td className="px-2 py-1 align-top">
                    {readOnly ? (
                      <div className="text-right tabular-nums">{fmtL(row.entry?.physicalRemainingLiters ?? 0)}</div>
                    ) : (
                      <input
                        type="text"
                        inputMode="decimal"
                        className={inputClass}
                        placeholder="0"
                        value={state.physicalRemainingLiters}
                        onChange={(e) => updatePhysical(row.batchNo, e.target.value)}
                      />
                    )}
                  </td>

                  {/* Variance — read-only computed column */}
                  <td
                    className={`px-3 py-1.5 text-right font-semibold tabular-nums ${
                      liveVariance === null
                        ? "text-zinc-400"
                        : liveVariance > 0
                          ? "text-red-700"
                          : liveVariance < 0
                            ? "text-amber-700"
                            : "text-emerald-700"
                    }`}
                  >
                    {liveVariance === null
                      ? "—"
                      : (liveVariance > 0 ? "+" : "") + fmtL(liveVariance)}
                  </td>

                  {!readOnly ? (
                    <td className="px-2 py-1.5 text-center text-xs text-zinc-500">
                      <button
                        type="button"
                        className="rounded bg-zinc-900 px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
                        disabled={rowStatus === "saving"}
                        onClick={() => void save(row.batchNo)}
                      >
                        {rowStatus === "saving" ? "Saving…" : rowStatus === "saved" ? "Saved" : "Save"}
                      </button>
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
