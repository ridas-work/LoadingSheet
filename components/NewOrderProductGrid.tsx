"use client";

import { useMemo, type RefObject } from "react";

import { previewCartonsFromBottles } from "@/lib/poBottleEntry";

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

export type GridEntryMode = "cartons" | "bottles" | "standard_bottles";

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
  const isMixedBottles = mode === "bottles";
  const isStandardBottles = mode === "standard_bottles";

  const summary = useMemo(() => {
    let productCount = 0;
    let totalQty = 0;
    let totalCartons = 0;
    for (const p of catalog) {
      const row = state[p.code];
      if (!row) continue;
      if (!rowIsActive(row)) continue;
      productCount += 1;
      const bottles = Number(row.cartons);
      totalQty += bottles;
      if (isStandardBottles) {
        const bpc = row.useDefaultPacking ? p.bottlesPerCarton : Number(row.bottlesPerBox);
        const c = previewCartonsFromBottles(row.cartons, bpc);
        if (c !== null) totalCartons += c;
      }
    }
    for (const r of otherRows) {
      if (!otherRowIsActive(r)) continue;
      productCount += 1;
      totalQty += Number(r.cartons);
      if (isStandardBottles) {
        const c = previewCartonsFromBottles(r.cartons, Number(r.bottlesPerBox));
        if (c !== null) totalCartons += c;
      }
    }
    return { productCount, totalQty, totalCartons };
  }, [catalog, isStandardBottles, otherRows, state]);

  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-zinc-900">Products</div>
          <div className="mt-0.5 text-xs text-zinc-600">
            {catalogLoading
              ? "Loading catalog…"
              : isMixedBottles
                ? "Enter bottles per product for one mixed sample box. Leave the rest blank."
                : isStandardBottles
                  ? "Enter total bottles per product. Full cartons are calculated automatically (e.g. 30 bottles Rhino 500ml = 1 carton). Odd counts — use Add custom carton."
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
            {isMixedBottles
              ? "bottles in mix"
              : isStandardBottles
                ? `bottles · ${summary.totalCartons} carton${summary.totalCartons === 1 ? "" : "s"}`
                : "cartons total"}
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
                {isMixedBottles || isStandardBottles ? "Bottles" : "Cartons"}
              </th>
              {isStandardBottles ? (
                <th className="w-24 px-3 py-2 text-center font-medium text-zinc-700">Cartons</th>
              ) : null}
              {!isMixedBottles && !isStandardBottles ? (
                <>
                  <th className="w-32 px-3 py-2 text-center font-medium text-zinc-700">Bottles / carton</th>
                  <th className="w-32 px-3 py-2 font-medium text-zinc-700" />
                </>
              ) : null}
              {isStandardBottles ? (
                <th className="w-32 px-3 py-2 font-medium text-zinc-700" />
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
                    {isStandardBottles || !isMixedBottles ? (
                      <div className="mt-0.5 text-[11px] text-zinc-500">
                        {p.bottlesPerCarton} bottles / carton
                      </div>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <input
                      id={`grid-${p.code}-cartons`}
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
                    ) : isStandardBottles && active ? (
                      (() => {
                        const bpc = row.useDefaultPacking
                          ? p.bottlesPerCarton
                          : Number(row.bottlesPerBox);
                        const valid = previewCartonsFromBottles(row.cartons, bpc) !== null;
                        return valid ? null : (
                          <p className="mt-1 text-[11px] text-amber-800">
                            Not a full carton — fix count or use custom carton
                          </p>
                        );
                      })()
                    ) : null}
                  </td>
                  {isStandardBottles ? (
                    <td className="px-3 py-2 text-center tabular-nums text-sm font-medium text-zinc-800">
                      {(() => {
                        const bpc = row.useDefaultPacking
                          ? p.bottlesPerCarton
                          : Number(row.bottlesPerBox);
                        const c = previewCartonsFromBottles(row.cartons, bpc);
                        return c !== null ? c : row.cartons.trim() ? "—" : "";
                      })()}
                    </td>
                  ) : null}
                  {!isMixedBottles && !isStandardBottles ? (
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
                  {isStandardBottles ? (
                    <td className="px-3 py-2">
                      <label className="flex cursor-pointer items-center gap-1.5 text-xs text-zinc-600">
                        <input
                          type="checkbox"
                          checked={!row.useDefaultPacking}
                          onChange={(e) => onUseDefaultPackingChange(p.code, !e.target.checked)}
                          className="rounded border-zinc-300"
                        />
                        <span>Custom / carton</span>
                      </label>
                      {!row.useDefaultPacking ? (
                        <div className="mt-1">
                          <input
                            inputMode="numeric"
                            value={row.bottlesPerBox}
                            onChange={(e) => onBottlesPerBoxChange(p.code, e.target.value)}
                            placeholder="Bottles/carton"
                            className={`w-24 rounded-lg border px-2 py-1 text-center text-xs outline-none ${
                              bpbErr ? "border-red-400" : "border-zinc-200"
                            }`}
                          />
                        </div>
                      ) : null}
                    </td>
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
                  {isStandardBottles ? (
                    <td className="px-3 py-2 text-center tabular-nums text-sm text-zinc-800">
                      {previewCartonsFromBottles(r.cartons, Number(r.bottlesPerBox)) ?? (r.cartons.trim() ? "—" : "")}
                    </td>
                  ) : null}
                  {!isMixedBottles && !isStandardBottles ? (
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
                    <td className="px-3 py-2" colSpan={isStandardBottles ? 2 : 1}>
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
              <td
                colSpan={isMixedBottles ? 1 : isStandardBottles ? 3 : 2}
                className="px-3 py-2 text-xs text-zinc-500"
              >
                {summary.productCount > 0
                  ? `${summary.productCount} product${summary.productCount === 1 ? "" : "s"} on this order`
                  : isMixedBottles
                    ? "Enter bottles for each product in the mixed box"
                    : isStandardBottles
                      ? "Enter bottle counts; cartons fill in when the count is a full multiple"
                      : "Enter cartons next to any product to include it"}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
