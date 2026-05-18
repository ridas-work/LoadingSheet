"use client";

import { useMemo, type RefObject } from "react";

export type CatalogProduct = {
  code: string;
  name: string;
  bottlesPerCarton: number;
};

export type GridRow = {
  cartons: string;
  bottlesPerBox: string;
  useDefaultPacking: boolean;
};

export type GridState = Record<string, GridRow>;

export type GridErrors = Record<string, string>;

export const OTHER_PREFIX = "__other_";

export function makeOtherCode(): string {
  return `${OTHER_PREFIX}${Date.now().toString(36)}`;
}

export function isOtherCode(code: string): boolean {
  return code.startsWith(OTHER_PREFIX);
}

export function defaultGridRow(bottlesPerCarton: number): GridRow {
  return {
    cartons: "",
    bottlesPerBox: String(bottlesPerCarton),
    useDefaultPacking: true,
  };
}

export type OtherRow = {
  code: string;
  productName: string;
  cartons: string;
  bottlesPerBox: string;
};

export function makeOtherRow(): OtherRow {
  return {
    code: makeOtherCode(),
    productName: "",
    cartons: "",
    bottlesPerBox: "10",
  };
}

export function rowIsActive(row: GridRow): boolean {
  const n = Number(row.cartons);
  return Number.isInteger(n) && n >= 1;
}

export function otherRowIsActive(row: OtherRow): boolean {
  const n = Number(row.cartons);
  return Boolean(row.productName.trim()) && Number.isInteger(n) && n >= 1;
}

export type GridEntryMode = "cartons" | "bottles";

type Props = {
  catalog: CatalogProduct[];
  catalogLoading: boolean;
  mode?: GridEntryMode;
  state: GridState;
  otherRows: OtherRow[];
  errors: GridErrors;
  itemsError?: string;
  firstInputRef?: RefObject<HTMLInputElement | null>;
  onCartonsChange: (code: string, value: string) => void;
  onBottlesPerBoxChange: (code: string, value: string) => void;
  onUseDefaultPackingChange: (code: string, useDefault: boolean) => void;
  onOtherChange: (code: string, patch: Partial<OtherRow>) => void;
  onAddOther: () => void;
  onRemoveOther: (code: string) => void;
};

function cellError(errors: GridErrors, code: string, field: string): string | undefined {
  return errors[`item.${code}.${field}`];
}

export function NewOrderProductGrid({
  catalog,
  catalogLoading,
  mode = "cartons",
  state,
  otherRows,
  errors,
  itemsError,
  firstInputRef,
  onCartonsChange,
  onBottlesPerBoxChange,
  onUseDefaultPackingChange,
  onOtherChange,
  onAddOther,
  onRemoveOther,
}: Props) {
  const isBottles = mode === "bottles";

  const summary = useMemo(() => {
    let productCount = 0;
    let totalQty = 0;
    for (const p of catalog) {
      const row = state[p.code];
      if (!row) continue;
      if (!rowIsActive(row)) continue;
      productCount += 1;
      totalQty += Number(row.cartons);
    }
    for (const r of otherRows) {
      if (!otherRowIsActive(r)) continue;
      productCount += 1;
      totalQty += Number(r.cartons);
    }
    return { productCount, totalQty };
  }, [catalog, otherRows, state]);

  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-zinc-900">Products</div>
          <div className="mt-0.5 text-xs text-zinc-600">
            {catalogLoading
              ? "Loading catalog…"
              : isBottles
                ? "Enter bottles per product for one mixed sample box. Leave the rest blank."
                : "Enter cartons next to each product you want on this order. Leave the rest blank."}
          </div>
        </div>
        <div className="text-right text-xs text-zinc-600">
          <div>
            <span className="font-semibold text-zinc-900">{summary.productCount}</span> product
            {summary.productCount === 1 ? "" : "s"}
          </div>
          <div>
            <span className="font-semibold text-zinc-900">{summary.totalQty}</span>{" "}
            {isBottles ? "bottles in mix" : "cartons total"}
          </div>
        </div>
      </div>

      {itemsError ? <div className="mt-3 text-sm text-red-700">{itemsError}</div> : null}

      <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <table className="w-full min-w-[36rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 text-left">
              <th className="min-w-[16rem] px-3 py-2 font-medium text-zinc-700">Product</th>
              <th className="w-28 px-3 py-2 text-center font-medium text-zinc-700">
                {isBottles ? "Bottles" : "Cartons"}
              </th>
              {!isBottles ? (
                <>
                  <th className="w-32 px-3 py-2 text-center font-medium text-zinc-700">Bottles / carton</th>
                  <th className="w-32 px-3 py-2 font-medium text-zinc-700" />
                </>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {catalog.map((p, idx) => {
              const row = state[p.code] ?? defaultGridRow(p.bottlesPerCarton);
              const active = rowIsActive(row);
              const bpbErr = cellError(errors, p.code, "bottlesPerBox");
              const cartonsErr = cellError(errors, p.code, "cartons");
              const locked = row.useDefaultPacking;

              return (
                <tr
                  key={p.code}
                  className={`border-b border-zinc-100 align-middle ${
                    active ? "bg-emerald-50/60" : "bg-white"
                  }`}
                >
                  <td className="px-3 py-2">
                    <div className="font-medium text-zinc-900">{p.name}</div>
                    {!isBottles ? (
                      <div className="mt-0.5 text-[11px] text-zinc-500">
                        Default {p.bottlesPerCarton} bottles / carton
                      </div>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <input
                      ref={idx === 0 ? firstInputRef : undefined}
                      inputMode="numeric"
                      value={row.cartons}
                      onChange={(e) => onCartonsChange(p.code, e.target.value)}
                      placeholder="0"
                      className={`w-24 rounded-lg border px-2 py-1.5 text-center text-sm outline-none focus:border-zinc-400 ${
                        cartonsErr
                          ? "border-red-400"
                          : active
                            ? "border-emerald-300 bg-white"
                            : "border-zinc-200"
                      }`}
                    />
                    {cartonsErr ? (
                      <p className="mt-1 text-[11px] text-red-700">{cartonsErr}</p>
                    ) : null}
                  </td>
                  {!isBottles ? (
                    <>
                      <td className="px-3 py-2 text-center">
                        <input
                          inputMode="numeric"
                          value={row.bottlesPerBox}
                          readOnly={locked}
                          onChange={(e) => onBottlesPerBoxChange(p.code, e.target.value)}
                          className={`w-20 rounded-lg border px-2 py-1.5 text-center text-sm outline-none focus:border-zinc-400 ${
                            bpbErr ? "border-red-400" : "border-zinc-200"
                          } ${locked ? "cursor-not-allowed bg-zinc-100 text-zinc-600" : "bg-white"}`}
                        />
                        {bpbErr ? <p className="mt-1 text-[11px] text-red-700">{bpbErr}</p> : null}
                      </td>
                      <td className="px-3 py-2">
                        <label className="flex cursor-pointer items-center gap-1.5 text-xs text-zinc-600">
                          <input
                            type="checkbox"
                            checked={!row.useDefaultPacking}
                            onChange={(e) => onUseDefaultPackingChange(p.code, !e.target.checked)}
                            className="rounded border-zinc-300"
                          />
                          <span>Sample / custom</span>
                        </label>
                      </td>
                    </>
                  ) : null}
                </tr>
              );
            })}

            {otherRows.map((r) => {
              const nameErr = cellError(errors, r.code, "productName");
              const cartonsErr = cellError(errors, r.code, "cartons");
              const bpbErr = cellError(errors, r.code, "bottlesPerBox");
              const active = otherRowIsActive(r);
              return (
                <tr
                  key={r.code}
                  className={`border-b border-zinc-100 align-middle ${
                    active ? "bg-emerald-50/60" : "bg-zinc-50/60"
                  }`}
                >
                  <td className="px-3 py-2">
                    <input
                      value={r.productName}
                      onChange={(e) => onOtherChange(r.code, { productName: e.target.value })}
                      placeholder="Other product name"
                      className={`w-full rounded-lg border px-2 py-1.5 text-sm outline-none focus:border-zinc-400 ${
                        nameErr ? "border-red-400" : "border-zinc-200"
                      }`}
                    />
                    {nameErr ? <p className="mt-1 text-[11px] text-red-700">{nameErr}</p> : null}
                    <div className="mt-0.5 text-[11px] text-zinc-500">Custom product (not in catalog)</div>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <input
                      inputMode="numeric"
                      value={r.cartons}
                      onChange={(e) => onOtherChange(r.code, { cartons: e.target.value })}
                      placeholder="0"
                      className={`w-24 rounded-lg border px-2 py-1.5 text-center text-sm outline-none focus:border-zinc-400 ${
                        cartonsErr
                          ? "border-red-400"
                          : active
                            ? "border-emerald-300 bg-white"
                            : "border-zinc-200"
                      }`}
                    />
                    {cartonsErr ? (
                      <p className="mt-1 text-[11px] text-red-700">{cartonsErr}</p>
                    ) : null}
                  </td>
                  {!isBottles ? (
                    <>
                      <td className="px-3 py-2 text-center">
                        <input
                          inputMode="numeric"
                          value={r.bottlesPerBox}
                          onChange={(e) => onOtherChange(r.code, { bottlesPerBox: e.target.value })}
                          className={`w-20 rounded-lg border px-2 py-1.5 text-center text-sm outline-none focus:border-zinc-400 ${
                            bpbErr ? "border-red-400" : "border-zinc-200"
                          } bg-white`}
                        />
                        {bpbErr ? <p className="mt-1 text-[11px] text-red-700">{bpbErr}</p> : null}
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => onRemoveOther(r.code)}
                          className="rounded-lg bg-white px-2 py-1.5 text-xs font-medium text-zinc-900 shadow-sm ring-1 ring-zinc-200"
                        >
                          Remove
                        </button>
                      </td>
                    </>
                  ) : (
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => onRemoveOther(r.code)}
                        className="rounded-lg bg-white px-2 py-1.5 text-xs font-medium text-zinc-900 shadow-sm ring-1 ring-zinc-200"
                      >
                        Remove
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-zinc-50">
              <td className="px-3 py-2 text-sm font-medium text-zinc-700">
                <button
                  type="button"
                  onClick={onAddOther}
                  className="rounded-lg bg-white px-2 py-1.5 text-xs font-medium text-zinc-900 shadow-sm ring-1 ring-zinc-200"
                >
                  + Add other product
                </button>
              </td>
              <td className="px-3 py-2 text-center text-sm font-semibold text-zinc-900">
                {summary.totalQty > 0 ? summary.totalQty : "—"}
              </td>
              <td colSpan={isBottles ? 1 : 2} className="px-3 py-2 text-xs text-zinc-500">
                {summary.productCount > 0
                  ? `${summary.productCount} product${summary.productCount === 1 ? "" : "s"} on this order`
                  : isBottles
                    ? "Enter bottles for each product in the mixed box"
                    : "Enter cartons next to any product to include it"}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
