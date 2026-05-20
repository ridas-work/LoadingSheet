"use client";

import { useCallback, useEffect, useState } from "react";

import { computeWasteLiters } from "@/lib/batchFillingWaste";
import { roundLiters } from "@/lib/batchVolume";

export type EntryData = {
  filledLitersToday: number;
  readyToDeliverLiters: number;
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
  entry: EntryData | null;
};

type RowState = {
  filledLitersToday: string;
  readyToDeliverLiters: string;
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

function fmtL(n: number) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function initState(row: FillingRow): RowState {
  return {
    filledLitersToday: row.entry ? String(row.entry.filledLitersToday) : "0",
    readyToDeliverLiters: row.entry ? String(row.entry.readyToDeliverLiters) : "0",
    physicalRemainingLiters: row.entry ? String(row.entry.physicalRemainingLiters) : "",
  };
}

function savedState(row: FillingRow): RowState {
  return initState(row);
}

function statesEqual(a: RowState, b: RowState) {
  return (
    a.filledLitersToday === b.filledLitersToday &&
    a.readyToDeliverLiters === b.readyToDeliverLiters &&
    a.physicalRemainingLiters === b.physicalRemainingLiters
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

  function update(batchNo: string, field: keyof RowState, value: string) {
    setStates((prev) => ({ ...prev, [batchNo]: { ...prev[batchNo]!, [field]: value } }));
    setSaveStatus((s) => {
      if (s[batchNo] === "saved" || s[batchNo] === "error") return { ...s, [batchNo]: "idle" };
      return s;
    });
  }

  const save = useCallback(
    async (batchNo: string) => {
      if (readOnly) return;
      const current = states[batchNo];
      const base = baseline[batchNo];
      if (!current || !base || statesEqual(current, base)) return;

      const filled = Number(current.filledLitersToday);
      const ready = Number(current.readyToDeliverLiters);
      const physical =
        current.physicalRemainingLiters === "" ? 0 : Number(current.physicalRemainingLiters);

      if (![filled, ready, physical].every((n) => Number.isFinite(n) && n >= 0)) {
        setSaveStatus((s) => ({ ...s, [batchNo]: "error" }));
        setErrors((e) => ({ ...e, [batchNo]: "All values must be numbers ≥ 0" }));
        return;
      }

      setSaveStatus((s) => ({ ...s, [batchNo]: "saving" }));
      setErrors((e) => { const next = { ...e }; delete next[batchNo]; return next; });

      const res = await fetch("/api/batch-filling", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchNo,
          entryDate: date,
          filledLitersToday: roundLiters(filled),
          readyToDeliverLiters: roundLiters(ready),
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
      const synced: RowState = {
        filledLitersToday: String(data.entry.filledLitersToday),
        readyToDeliverLiters: String(data.entry.readyToDeliverLiters),
        physicalRemainingLiters: String(data.entry.physicalRemainingLiters),
      };
      setStates((prev) => ({ ...prev, [batchNo]: synced }));
      setBaseline((prev) => ({ ...prev, [batchNo]: synced }));
      setLiveSystem((prev) => ({ ...prev, [batchNo]: data.entry.systemRemainingLiters }));
      setSaveStatus((s) => ({ ...s, [batchNo]: "saved" }));
      setTimeout(() => {
        setSaveStatus((s) => (s[batchNo] === "saved" ? { ...s, [batchNo]: "idle" } : s));
      }, 1500);
    },
    [readOnly, states, baseline, date],
  );

  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-600">
        No active batches. Nimra registers batches in Production.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
      {!readOnly ? (
        <p className="border-b border-zinc-100 bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
          Enter today&apos;s filling data. Each row saves automatically when you leave it.
          Waste (L) = Nimra remaining − Filled today − Ready to deliver − Physical remaining. Zero
          means everything balances.
        </p>
      ) : null}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[60rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs text-zinc-600">
              <th className="min-w-[12rem] px-3 py-2.5 font-semibold text-zinc-800">Batch / Product</th>
              <th className="w-28 px-3 py-2.5 text-right font-semibold">
                Nimra remaining (L)
                <div className="font-normal text-zinc-500">(system)</div>
              </th>
              <th className="w-28 px-3 py-2.5 text-right font-semibold">Filled today (L)</th>
              <th className="w-28 px-3 py-2.5 text-right font-semibold">Ready to deliver (L)</th>
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

              const filledNum = Number(state.filledLitersToday);
              const readyNum = Number(state.readyToDeliverLiters);
              const physicalNum =
                state.physicalRemainingLiters === ""
                  ? 0
                  : Number(state.physicalRemainingLiters);
              const numsValid = [filledNum, readyNum, physicalNum].every(
                (n) => Number.isFinite(n) && n >= 0,
              );
              const liveVariance =
                state.physicalRemainingLiters !== "" && numsValid
                  ? computeWasteLiters(sysRemaining, filledNum, readyNum, physicalNum)
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

                  {readOnly ? (
                    <>
                      <td className="px-3 py-1.5 text-right tabular-nums">{fmtL(row.entry?.filledLitersToday ?? 0)}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{fmtL(row.entry?.readyToDeliverLiters ?? 0)}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{fmtL(row.entry?.physicalRemainingLiters ?? 0)}</td>
                    </>
                  ) : (
                    <>
                      <td className="px-2 py-1">
                        <input
                          type="text"
                          inputMode="decimal"
                          className={inputClass}
                          value={state.filledLitersToday}
                          onChange={(e) => update(row.batchNo, "filledLitersToday", e.target.value)}
                          onBlur={() => save(row.batchNo)}
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="text"
                          inputMode="decimal"
                          className={inputClass}
                          value={state.readyToDeliverLiters}
                          onChange={(e) => update(row.batchNo, "readyToDeliverLiters", e.target.value)}
                          onBlur={() => save(row.batchNo)}
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="text"
                          inputMode="decimal"
                          className={inputClass}
                          placeholder="0"
                          value={state.physicalRemainingLiters}
                          onChange={(e) => update(row.batchNo, "physicalRemainingLiters", e.target.value)}
                          onBlur={() => save(row.batchNo)}
                        />
                      </td>
                    </>
                  )}

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
                      {rowStatus === "saving" ? "…" : rowStatus === "saved" ? "✓" : null}
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
