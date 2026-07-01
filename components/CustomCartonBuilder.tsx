"use client";

import {
  CUSTOM_BOTTLE_SIZE_OPTIONS,
  composeCustomLineProductName,
  inferBottleSizeCodeFromSavedLine,
  normalizeBottleSizeCode,
} from "@/lib/customBottleSizes";
import { findPackingForLineName } from "@/lib/productPackingMatch";

/** Minimal product shape for the custom-carton picker (matches `CatalogProduct` fields used here). */
export type CustomCartonCatalogProduct = {
  code: string;
  name: string;
  litersPerBottle?: number | null;
  batchFamily?: string | null;
};

export type CartonContentRow = {
  id: string;
  /**
   * When using catalog UI: selected `code`, `"__other__"` for free-text name, or `""` unset.
   * Omitted/undefined = treat as legacy free-text row (no dropdown).
   */
  productPick?: string;
  productName: string;
  bottles: string;
  /** Container size per line: catalog default, 5l-jar, 1l, etc. */
  bottleSizeCode: string;
  /** Saved catalog code round-trip (fabrito-fabric-softener-pouch, etc.). */
  packingCode?: string;
};

export type CustomCartonDraft = {
  id: string;
  boxCount: string;
  label: string;
  /** Legacy outer box code — optional, not shown in UI. */
  customBoxCode: string;
  rows: CartonContentRow[];
};

function rid() {
  return `c${Math.random().toString(36).slice(2, 11)}`;
}

export function emptyContentRow(): CartonContentRow {
  return { id: rid(), productPick: "", productName: "", bottles: "", bottleSizeCode: "catalog" };
}

export function emptyCartonDraft(): CustomCartonDraft {
  return {
    id: rid(),
    boxCount: "1",
    label: "",
    customBoxCode: "",
    rows: [emptyContentRow()],
  };
}

function findCatalogProduct(
  code: string,
  catalog: CustomCartonCatalogProduct[],
): CustomCartonCatalogProduct | undefined {
  return catalog.find((p) => p.code === code);
}

function findCatalogCodeForName(name: string, catalog: CustomCartonCatalogProduct[]): string | undefined {
  const key = name.trim().toLowerCase();
  if (!key) return undefined;
  const exact = catalog.find((p) => p.name.trim().toLowerCase() === key);
  if (exact) return exact.code;
  const hit = findPackingForLineName(name, catalog);
  return hit?.code;
}

function catalogBaseForRow(
  row: CartonContentRow,
  catalog?: CustomCartonCatalogProduct[],
): string | undefined {
  if (!catalog?.length) return row.productName.trim() || undefined;
  if (row.productPick && row.productPick !== "__other__") {
    const p = findCatalogProduct(row.productPick, catalog);
    if (p) return p.name.trim();
  }
  if (row.productName.trim()) return row.productName.trim();
  return undefined;
}

export function draftsFromSavedCartons(
  cartons: Array<{
    boxCount: number;
    contents: Array<{
      productName: string;
      bottles: number;
      bottleSizeCode?: string;
      packingCode?: string;
    }>;
    label?: string;
    customBoxCode?: string;
  }>,
  catalog?: CustomCartonCatalogProduct[],
): CustomCartonDraft[] {
  return cartons.map((c) => {
    const savedCode = typeof c.customBoxCode === "string" ? c.customBoxCode.trim() : "";
    return {
      id: rid(),
      boxCount: String(c.boxCount),
      label: typeof c.label === "string" ? c.label : "",
      customBoxCode: savedCode,
      rows: c.contents.map((row) => {
        const productName = row.productName;
        let productPick: string | undefined;
        let catalogName: string | undefined;
        const savedPackingCode = row.packingCode?.trim();
        if (catalog?.length) {
          if (savedPackingCode && catalog.some((p) => p.code === savedPackingCode)) {
            productPick = savedPackingCode;
            catalogName = findCatalogProduct(savedPackingCode, catalog)?.name;
          } else {
            const code = findCatalogCodeForName(productName, catalog);
            if (code) {
              productPick = code;
              catalogName = findCatalogProduct(code, catalog)?.name;
            } else {
              productPick = productName.trim() ? "__other__" : "";
            }
          }
        }
        const bottleSizeCode = inferBottleSizeCodeFromSavedLine(
          productName,
          catalogName,
          row.bottleSizeCode,
        );
        return {
          id: rid(),
          productPick,
          productName: catalogName ?? productName,
          bottles: String(row.bottles),
          bottleSizeCode,
          ...(savedPackingCode ? { packingCode: savedPackingCode } : {}),
        };
      }),
    };
  });
}

/** Resolved display/storage name for API (catalog pick + container size). */
export function resolvedCustomRowProductName(
  row: CartonContentRow,
  catalog?: CustomCartonCatalogProduct[],
): string {
  let name = row.productName.trim();
  if (catalog?.length && row.productPick && row.productPick !== "__other__") {
    const p = findCatalogProduct(row.productPick, catalog);
    if (p) name = p.name.trim();
  }
  if (!name) return "";
  return composeCustomLineProductName(name, row.bottleSizeCode || "catalog");
}

export function buildCustomCartonsPayload(
  drafts: CustomCartonDraft[],
  catalog?: CustomCartonCatalogProduct[],
): Array<{
  boxCount: number;
  contents: Array<{
    productName: string;
    bottles: number;
    bottleSizeCode?: string;
    packingCode?: string;
  }>;
  label?: string;
  customBoxCode?: string;
}> {
  const out: Array<{
    boxCount: number;
    contents: Array<{
      productName: string;
      bottles: number;
      bottleSizeCode?: string;
      packingCode?: string;
    }>;
    label?: string;
    customBoxCode?: string;
  }> = [];
  for (const c of drafts) {
    const boxCount = Number(c.boxCount);
    if (!Number.isInteger(boxCount) || boxCount < 1) continue;
    const contents: Array<{
      productName: string;
      bottles: number;
      bottleSizeCode?: string;
      packingCode?: string;
    }> = [];
    for (const r of c.rows) {
      const pn = resolvedCustomRowProductName(r, catalog);
      const b = Number(r.bottles);
      if (!pn) continue;
      if (!Number.isInteger(b) || b < 1) continue;
      const sizeCode = normalizeBottleSizeCode(r.bottleSizeCode) || "catalog";
      const packingCode =
        r.productPick && r.productPick !== "__other__" ? r.productPick.trim().toLowerCase() : "";
      contents.push({
        productName: pn,
        bottles: b,
        ...(packingCode ? { packingCode } : {}),
        ...(sizeCode && sizeCode !== "catalog" ? { bottleSizeCode: sizeCode } : {}),
      });
    }
    if (contents.length === 0) continue;
    const customBoxCode = c.customBoxCode.trim().toLowerCase();
    const label = c.label.trim();
    out.push({
      boxCount,
      contents,
      ...(customBoxCode ? { customBoxCode } : {}),
      ...(label ? { label } : {}),
    });
  }
  return out;
}

function rowSelectValue(row: CartonContentRow, catalog: CustomCartonCatalogProduct[]): string {
  if (row.productPick === "__other__") return "__other__";
  if (row.productPick && row.productPick !== "__other__") {
    return catalog.some((c) => c.code === row.productPick) ? row.productPick : "";
  }
  const name = row.productName.trim();
  if (!name) return "";
  const code = findCatalogCodeForName(name, catalog);
  return code ?? "__other__";
}

export type CustomCartonErrors = Record<string, string>;

function cartonError(errors: CustomCartonErrors | undefined, ci: number, field: string): string | undefined {
  return errors?.[`customCartons.${ci}.${field}`];
}

function rowError(
  errors: CustomCartonErrors | undefined,
  ci: number,
  ri: number,
  field: string,
): string | undefined {
  return errors?.[`customCartons.${ci}.rows.${ri}.${field}`];
}

type Props = {
  cartons: CustomCartonDraft[];
  onChange: (next: CustomCartonDraft[]) => void;
  disabled?: boolean;
  errors?: CustomCartonErrors;
  /** When set and non-empty, each line uses a catalog dropdown plus optional “Other…”. */
  catalogProducts?: CustomCartonCatalogProduct[];
};

export function CustomCartonBuilder({ cartons, onChange, disabled, errors, catalogProducts }: Props) {
  const useCatalog = Boolean(catalogProducts && catalogProducts.length > 0);
  const sortedCatalog = useCatalog
    ? [...catalogProducts!].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
    : [];

  function updateCarton(index: number, patch: Partial<CustomCartonDraft>) {
    onChange(cartons.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }

  function updateRow(cartonIndex: number, rowId: string, patch: Partial<CartonContentRow>) {
    const c = cartons[cartonIndex];
    if (!c) return;
    const rows = c.rows.map((r) => (r.id === rowId ? { ...r, ...patch } : r));
    updateCarton(cartonIndex, { rows });
  }

  function addRow(cartonIndex: number) {
    const c = cartons[cartonIndex];
    if (!c) return;
    updateCarton(cartonIndex, { rows: [...c.rows, emptyContentRow()] });
  }

  function removeRow(cartonIndex: number, rowId: string) {
    const c = cartons[cartonIndex];
    if (!c || c.rows.length <= 1) return;
    updateCarton(cartonIndex, { rows: c.rows.filter((r) => r.id !== rowId) });
  }

  function removeCarton(index: number) {
    onChange(cartons.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-4">
      <div className="text-sm font-medium text-zinc-900">Custom cartons (optional)</div>
      <p className="text-xs text-zinc-600">
        Pack several different products in one physical carton — e.g. pouches and bottles together. Each custom
        carton appears as its own row on the loading sheet (like a mixed box). Standard lines above stay separate.
        For each product line, pick the bottle or jar size (e.g. 5 litre jar for Rhino) — not the outer shipping
        box.
        The label on sheet is printed as a stick-on carton label from the loading sheet (Print carton labels).
        {useCatalog ? " Pick a catalog product from the list, or “Other…” for a name not in the list." : ""}
      </p>
      {cartons.map((carton, ci) => {
        const boxCountErr = cartonError(errors, ci, "boxCount");
        const contentsErr = cartonError(errors, ci, "contents");

        return (
        <div
          key={carton.id}
          className={`rounded-lg border bg-zinc-50/80 p-4 ring-1 ${
            boxCountErr || contentsErr ? "border-red-300 ring-red-100" : "border-zinc-200 ring-zinc-100"
          }`}
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <span className="text-sm font-medium text-zinc-800">Custom carton {ci + 1}</span>
            <button
              type="button"
              disabled={disabled}
              onClick={() => removeCarton(ci)}
              className="text-xs font-medium text-red-700 hover:underline disabled:opacity-50"
            >
              Remove carton
            </button>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-zinc-700" htmlFor={`cc-${carton.id}-count`}>
                How many identical cartons?
              </label>
              <input
                id={`cc-${carton.id}-count`}
                type="text"
                inputMode="numeric"
                disabled={disabled}
                value={carton.boxCount}
                onChange={(e) => updateCarton(ci, { boxCount: e.target.value })}
                placeholder="e.g. 1"
                className={`mt-1 w-full rounded-lg border bg-white px-2 py-1.5 text-sm ${
                  boxCountErr ? "border-red-400" : "border-zinc-200"
                }`}
              />
              {boxCountErr ? <p className="mt-1 text-[11px] text-red-700">{boxCountErr}</p> : null}
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-700" htmlFor={`cc-${carton.id}-label`}>
                Label on sheet (optional)
              </label>
              <input
                id={`cc-${carton.id}-label`}
                type="text"
                disabled={disabled}
                value={carton.label}
                onChange={(e) => updateCarton(ci, { label: e.target.value })}
                placeholder="Auto from products if empty"
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm"
              />
            </div>
          </div>
          <div className="mt-3 space-y-2">
            <div className="text-xs font-medium text-zinc-700">Products inside this carton</div>
            {carton.rows.map((row, ri) => {
              const sel = useCatalog ? rowSelectValue(row, sortedCatalog) : "";
              const showOtherInput = useCatalog && sel === "__other__";
              const nameErr = rowError(errors, ci, ri, "productName");
              const bottlesErr = rowError(errors, ci, ri, "bottles");
              const sizeErr = rowError(errors, ci, ri, "bottleSizeCode");
              const sizeCode = normalizeBottleSizeCode(row.bottleSizeCode) || "catalog";
              const previewBase = catalogBaseForRow(row, sortedCatalog);
              const previewName =
                previewBase && sizeCode !== "catalog"
                  ? composeCustomLineProductName(previewBase, sizeCode)
                  : null;

              return (
                <div key={row.id} className="flex flex-wrap items-end gap-2">
                  <div className="min-w-[10rem] flex-1 space-y-1">
                    {useCatalog ? (
                      <>
                        <label className="sr-only" htmlFor={`cc-row-${row.id}-pick`}>
                          Product
                        </label>
                        <select
                          id={`cc-row-${row.id}-pick`}
                          disabled={disabled}
                          value={sel}
                          className={`w-full rounded-lg border bg-white px-2 py-1.5 text-sm ${
                            nameErr ? "border-red-400" : "border-zinc-200"
                          }`}
                          onChange={(e) => {
                            const v = e.target.value;
                            if (v === "") {
                              updateRow(ci, row.id, { productPick: "", productName: "" });
                            } else if (v === "__other__") {
                              updateRow(ci, row.id, {
                                productPick: "__other__",
                                productName: row.productName.trim() ? row.productName : "",
                              });
                            } else {
                              const p = sortedCatalog.find((c) => c.code === v);
                              updateRow(ci, row.id, {
                                productPick: v,
                                productName: p?.name ?? "",
                                packingCode: v,
                              });
                            }
                          }}
                        >
                          <option value="">Select product…</option>
                          {sortedCatalog.map((p) => (
                            <option key={p.code} value={p.code}>
                              {p.name}
                            </option>
                          ))}
                          <option value="__other__">Other…</option>
                        </select>
                        {showOtherInput ? (
                          <input
                            type="text"
                            disabled={disabled}
                            value={row.productName}
                            onChange={(e) => updateRow(ci, row.id, { productName: e.target.value })}
                            placeholder="Product name (not in catalog)"
                            className={`w-full rounded-lg border bg-white px-2 py-1.5 text-sm ${
                              nameErr ? "border-red-400" : "border-zinc-200"
                            }`}
                          />
                        ) : null}
                        {nameErr ? <p className="text-[11px] text-red-700">{nameErr}</p> : null}
                      </>
                    ) : (
                      <input
                        type="text"
                        disabled={disabled}
                        value={row.productName}
                        onChange={(e) => updateRow(ci, row.id, { productName: e.target.value })}
                        placeholder="Product name"
                        className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm"
                      />
                    )}
                  </div>
                  <div className="w-36">
                    <label className="sr-only" htmlFor={`cc-row-${row.id}-size`}>
                      Container size
                    </label>
                    <select
                      id={`cc-row-${row.id}-size`}
                      disabled={disabled}
                      value={sizeCode}
                      onChange={(e) => updateRow(ci, row.id, { bottleSizeCode: e.target.value })}
                      className={`w-full rounded-lg border bg-white px-2 py-1.5 text-sm ${
                        sizeErr ? "border-red-400" : "border-zinc-200"
                      }`}
                    >
                      {CUSTOM_BOTTLE_SIZE_OPTIONS.map((opt) => (
                        <option key={opt.code} value={opt.code}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    {sizeErr ? <p className="text-[11px] text-red-700">{sizeErr}</p> : null}
                  </div>
                  <div className="w-20">
                    <label className="sr-only" htmlFor={`cc-row-${row.id}-bottles`}>
                      Bottles
                    </label>
                    <input
                      id={`cc-row-${row.id}-bottles`}
                      type="text"
                      inputMode="numeric"
                      disabled={disabled}
                      value={row.bottles}
                      onChange={(e) => updateRow(ci, row.id, { bottles: e.target.value })}
                      placeholder="Qty"
                      className={`w-full rounded-lg border bg-white px-2 py-1.5 text-sm ${
                        bottlesErr ? "border-red-400" : "border-zinc-200"
                      }`}
                    />
                    {bottlesErr ? <p className="text-[11px] text-red-700">{bottlesErr}</p> : null}
                  </div>
                  <button
                    type="button"
                    disabled={disabled || carton.rows.length <= 1}
                    onClick={() => removeRow(ci, row.id)}
                    className="rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-700 disabled:opacity-40"
                  >
                    ×
                  </button>
                  {previewName ? (
                    <p className="w-full text-[11px] text-zinc-500">Sheet line: {previewName}</p>
                  ) : null}
                </div>
              );
            })}
            <button
              type="button"
              disabled={disabled}
              onClick={() => addRow(ci)}
              className="text-xs font-medium text-zinc-700 underline"
            >
              + Add product line
            </button>
            {contentsErr ? <p className="text-[11px] text-red-700">{contentsErr}</p> : null}
          </div>
        </div>
      );
      })}
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange([...cartons, emptyCartonDraft()])}
        className="rounded-lg border border-dashed border-zinc-400 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
      >
        + Add custom carton
      </button>
    </div>
  );
}
