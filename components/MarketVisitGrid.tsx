"use client";

import Link from "next/link";
import type { CSSProperties } from "react";

import { formatDisplayDate } from "@/lib/dateOnly";
import { getMarketVisitSkuGroups } from "@/lib/marketVisitCatalog";
import { normalizeMarketStoreKey } from "@/lib/marketVisitStoreKey";
import type { MarketVisitAvailabilityValue, MarketVisitRow } from "@/lib/marketVisitTypes";

const SKU_GROUPS = getMarketVisitSkuGroups();

export type CellAlertState = "no" | "open" | "ok";

export function cellAlertState(
  row: MarketVisitRow,
  skuKey: string,
  openAlertsByStoreKey: Record<string, string[]>,
): CellAlertState {
  const value = row.availability[skuKey] ?? "";
  if (value === "yes") return "ok";
  if (value === "no") return "no";
  if (!row.storeName.trim()) return "ok";
  const storeKey = normalizeMarketStoreKey(row.storeName, row.location);
  const open = openAlertsByStoreKey[storeKey] ?? [];
  return open.includes(skuKey) ? "open" : "ok";
}

function availabilityCellClass(state: CellAlertState): string {
  if (state === "no") return "market-visit-cell-no";
  if (state === "open") return "market-visit-cell-open-alert";
  return "market-visit-cell-ok";
}

function availabilityCellStyle(state: CellAlertState): CSSProperties | undefined {
  if (state === "no" || state === "open") {
    return {
      backgroundColor: "#fecaca",
      boxShadow: "inset 0 0 0 2px #dc2626",
    };
  }
  return undefined;
}

function availabilityDisplay(
  row: MarketVisitRow,
  skuKey: string,
  alertState: CellAlertState,
): string {
  if (row.availability[skuKey] === "yes") return "Y";
  if (row.availability[skuKey] === "no" || alertState === "open") return "N";
  return "—";
}

export type MarketVisitGridVisitMeta = {
  visitId: string;
  visitDate: string | null;
  repName: string;
};

export type MarketVisitGridProps = {
  title: string;
  rows: MarketVisitRow[];
  readOnly: boolean;
  mode: "availability" | "facing";
  openAlertsByStoreKey?: Record<string, string[]>;
  onRowChange?: (index: number, row: MarketVisitRow) => void;
  visitMeta?: MarketVisitGridVisitMeta[];
  reportView?: boolean;
};

export function MarketVisitGrid({
  title,
  rows,
  readOnly,
  mode,
  openAlertsByStoreKey = {},
  onRowChange,
  visitMeta,
  reportView = false,
}: MarketVisitGridProps) {
  const editable = !readOnly && !reportView && onRowChange;

  return (
    <section className="market-visit-section space-y-2">
      <h2 className="text-sm font-bold uppercase tracking-wide text-zinc-900 print:text-black">
        {title}
      </h2>
      <div className="overflow-x-auto rounded-lg border border-zinc-300 bg-white print:overflow-visible print:border-black">
        <table className="min-w-[1200px] border-collapse text-xs print:min-w-full print:text-[10px]">
          <thead>
            <tr className="bg-zinc-100 print:bg-white">
              {visitMeta ? (
                <>
                  <th
                    rowSpan={2}
                    className="border border-zinc-300 px-2 py-2 text-left font-semibold print:border-black"
                  >
                    Visit
                  </th>
                  <th
                    rowSpan={2}
                    className="border border-zinc-300 px-2 py-2 text-left font-semibold print:border-black"
                  >
                    Rep
                  </th>
                </>
              ) : null}
              <th
                rowSpan={2}
                className="sticky left-0 z-10 border border-zinc-300 bg-zinc-100 px-2 py-2 text-left font-semibold print:static print:bg-white print:border-black"
              >
                STORE NAME
              </th>
              <th
                rowSpan={2}
                className="border border-zinc-300 px-2 py-2 text-left font-semibold print:border-black"
              >
                Location
              </th>
              {SKU_GROUPS.map((g) => (
                <th
                  key={g.group}
                  colSpan={g.skus.length}
                  className="border border-zinc-300 px-1 py-1 text-center font-semibold print:border-black"
                >
                  {g.group}
                </th>
              ))}
              <th
                rowSpan={2}
                className="border border-zinc-300 px-2 py-2 text-left font-semibold print:border-black"
              >
                REMARKS
              </th>
            </tr>
            <tr className="bg-zinc-50 print:bg-white">
              {SKU_GROUPS.flatMap((g) =>
                g.skus.map((sku) => (
                  <th
                    key={sku.key}
                    className="border border-zinc-300 px-1 py-1 text-center font-medium whitespace-nowrap print:border-black"
                  >
                    {sku.columnLabel}
                  </th>
                )),
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => {
              const meta = visitMeta?.[rowIndex];
              return (
                <tr key={rowIndex} className="hover:bg-zinc-50/50">
                  {meta ? (
                    <>
                      <td className="border border-zinc-300 px-2 py-1 whitespace-nowrap print:border-black">
                        <Link
                          href={`/field-visits/${meta.visitId}`}
                          className="text-brand-700 hover:underline"
                        >
                          {meta.visitDate ? formatDisplayDate(meta.visitDate) : "—"}
                        </Link>
                      </td>
                      <td className="border border-zinc-300 px-2 py-1 print:border-black">
                        {meta.repName}
                      </td>
                    </>
                  ) : null}
                  <td className="sticky left-0 z-10 border border-zinc-300 bg-white px-1 py-1 print:static print:border-black">
                    {editable ? (
                      <input
                        type="text"
                        value={row.storeName}
                        onChange={(e) =>
                          onRowChange!(rowIndex, { ...row, storeName: e.target.value })
                        }
                        className="w-28 min-w-[7rem] rounded border-0 bg-transparent px-1 py-0.5 text-xs focus:bg-white focus:ring-1 focus:ring-zinc-400 print:hidden"
                      />
                    ) : (
                      <span>{row.storeName}</span>
                    )}
                    <span className="hidden print:inline">{row.storeName}</span>
                  </td>
                  <td className="border border-zinc-300 px-1 py-1 print:border-black">
                    {editable ? (
                      <input
                        type="text"
                        value={row.location}
                        onChange={(e) =>
                          onRowChange!(rowIndex, { ...row, location: e.target.value })
                        }
                        className="w-24 min-w-[6rem] rounded border-0 bg-transparent px-1 py-0.5 text-xs focus:bg-white focus:ring-1 focus:ring-zinc-400 print:hidden"
                      />
                    ) : (
                      <span>{row.location}</span>
                    )}
                    <span className="hidden print:inline">{row.location}</span>
                  </td>
                  {SKU_GROUPS.flatMap((g) =>
                    g.skus.map((sku) => {
                      const alertState =
                        mode === "availability"
                          ? cellAlertState(row, sku.key, openAlertsByStoreKey)
                          : "ok";
                      const cellClass =
                        mode === "availability" ? availabilityCellClass(alertState) : "";
                      const alertTitle =
                        alertState === "open"
                          ? "Still out of stock — mark Y when restocked"
                          : undefined;

                      return (
                        <td
                          key={sku.key}
                          title={alertTitle}
                          data-alert={alertState}
                          style={
                            mode === "availability" ? availabilityCellStyle(alertState) : undefined
                          }
                          className={`border border-zinc-300 px-0.5 py-0.5 text-center print:border-black ${cellClass}`}
                        >
                          {mode === "availability" ? (
                            editable ? (
                              <select
                                value={row.availability[sku.key] ?? ""}
                                onChange={(e) =>
                                  onRowChange!(rowIndex, {
                                    ...row,
                                    availability: {
                                      ...row.availability,
                                      [sku.key]: e.target.value as MarketVisitAvailabilityValue,
                                    },
                                  })
                                }
                                className={`w-full rounded border px-0.5 py-0.5 text-xs font-semibold print:hidden ${
                                  alertState === "no" || alertState === "open"
                                    ? "border-red-600 bg-red-200 text-red-950"
                                    : "border-zinc-200 bg-white text-zinc-900"
                                }`}
                              >
                                <option value="">—</option>
                                <option value="yes">Y</option>
                                <option value="no">N</option>
                              </select>
                            ) : (
                              <span className="font-semibold">
                                {availabilityDisplay(row, sku.key, alertState)}
                              </span>
                            )
                          ) : editable ? (
                            <input
                              type="number"
                              min={0}
                              step={1}
                              value={row.facingUnits[sku.key] ?? ""}
                              onChange={(e) => {
                                const raw = e.target.value.trim();
                                const next =
                                  raw === "" ? null : Math.max(0, Math.floor(Number(raw) || 0));
                                onRowChange!(rowIndex, {
                                  ...row,
                                  facingUnits: { ...row.facingUnits, [sku.key]: next },
                                });
                              }}
                              className="w-12 rounded border border-zinc-200 bg-white px-0.5 py-0.5 text-center text-xs print:hidden"
                            />
                          ) : (
                            <span>{row.facingUnits[sku.key] ?? "—"}</span>
                          )}
                          <span className="hidden print:inline">
                            {mode === "availability"
                              ? availabilityDisplay(row, sku.key, alertState)
                              : (row.facingUnits[sku.key] ?? "")}
                          </span>
                        </td>
                      );
                    }),
                  )}
                  <td className="border border-zinc-300 px-1 py-1 print:border-black">
                    {editable ? (
                      <input
                        type="text"
                        value={row.remarks}
                        onChange={(e) =>
                          onRowChange!(rowIndex, { ...row, remarks: e.target.value })
                        }
                        className="w-24 min-w-[6rem] rounded border-0 bg-transparent px-1 py-0.5 text-xs focus:bg-white focus:ring-1 focus:ring-zinc-400 print:hidden"
                      />
                    ) : (
                      <span>{row.remarks}</span>
                    )}
                    <span className="hidden print:inline">{row.remarks}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
