"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

type CatalogProduct = { code: string; name: string; bottlesPerCarton: number };

type ItemRow = {
  id: string;
  /** Empty = not chosen; "__custom__" = other product */
  catalogCode: string;
  productName: string;
  boxes: string;
  bottlesPerBox: string;
  /** When true, bottles/carton follows catalog default when a catalog line is selected */
  useDefaultPacking: boolean;
};

type FieldErrors = Partial<Record<"poNumber" | "customerName" | "items", string>> & Record<string, string>;

const INITIAL_ITEM_ROW_ID = "item-0";
const CUSTOM_CODE = "__custom__";

function emptyRow(): ItemRow {
  return {
    id: INITIAL_ITEM_ROW_ID,
    catalogCode: "",
    productName: "",
    boxes: "",
    bottlesPerBox: "10",
    useDefaultPacking: true,
  };
}

export default function NewOrderPage() {
  const [poNumber, setPoNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [items, setItems] = useState<ItemRow[]>([emptyRow()]);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<CatalogProduct[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const customerRef = useRef<HTMLInputElement | null>(null);
  const firstSelectRef = useRef<HTMLSelectElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/products", { credentials: "same-origin" });
        const data = (await res.json()) as CatalogProduct[];
        if (!cancelled && Array.isArray(data)) setCatalog(data);
      } catch {
        if (!cancelled) setCatalog([]);
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const catalogByCode = useMemo(() => new Map(catalog.map((p) => [p.code, p])), [catalog]);

  const canSubmit = useMemo(() => poNumber.trim() && customerName.trim(), [customerName, poNumber]);

  function validate(): FieldErrors {
    const next: FieldErrors = {};
    if (!poNumber.trim()) next.poNumber = "PO number is required.";
    if (!customerName.trim()) next.customerName = "Customer name is required.";

    let validCount = 0;
    items.forEach((it, idx) => {
      const pn = it.productName.trim();
      const boxCount = Number(it.boxes);
      const bpb = Number(it.bottlesPerBox);

      if (!it.catalogCode) next[`items.${idx}.catalog`] = "Choose a product or Other.";
      if (it.catalogCode === CUSTOM_CODE && !pn) next[`items.${idx}.productName`] = "Enter product name.";
      if (it.catalogCode && it.catalogCode !== CUSTOM_CODE && !pn) next[`items.${idx}.productName`] = "Product name is required.";

      if (!it.boxes.trim()) next[`items.${idx}.boxes`] = "Number of cartons is required.";
      else if (!Number.isInteger(boxCount) || boxCount < 1)
        next[`items.${idx}.boxes`] = "Cartons must be an integer ≥ 1.";
      if (!it.bottlesPerBox.trim()) next[`items.${idx}.bottlesPerBox`] = "Bottles per carton is required.";
      else if (!Number.isInteger(bpb) || bpb < 1)
        next[`items.${idx}.bottlesPerBox`] = "Must be an integer ≥ 1.";

      const nameOk = it.catalogCode === CUSTOM_CODE ? !!pn : it.catalogCode && !!pn;
      if (nameOk && Number.isInteger(boxCount) && boxCount >= 1 && Number.isInteger(bpb) && bpb >= 1) {
        validCount += 1;
      }
    });
    if (validCount === 0) next.items = "Add at least one complete product line.";
    return next;
  }

  function onCatalogChange(rowId: string, value: string) {
    setItems((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;
        if (!value) {
          return { ...row, catalogCode: "", productName: "", useDefaultPacking: true, bottlesPerBox: "10" };
        }
        if (value === CUSTOM_CODE) {
          return {
            ...row,
            catalogCode: CUSTOM_CODE,
            productName: "",
            useDefaultPacking: false,
            bottlesPerBox: row.bottlesPerBox || "1",
          };
        }
        const p = catalogByCode.get(value);
        if (!p) return { ...row, catalogCode: value, productName: "", useDefaultPacking: true };
        return {
          ...row,
          catalogCode: value,
          productName: p.name,
          useDefaultPacking: true,
          bottlesPerBox: String(p.bottlesPerCarton),
        };
      }),
    );
  }

  function setUseDefaultPacking(rowId: string, useDefault: boolean) {
    setItems((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;
        if (row.catalogCode === CUSTOM_CODE || !row.catalogCode) {
          return { ...row, useDefaultPacking: false };
        }
        const p = catalogByCode.get(row.catalogCode);
        if (!p) return { ...row, useDefaultPacking: false };
        return {
          ...row,
          useDefaultPacking: useDefault,
          bottlesPerBox: useDefault ? String(p.bottlesPerCarton) : row.bottlesPerBox,
        };
      }),
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSuccessId(null);

    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          poNumber: poNumber.trim(),
          customerName: customerName.trim(),
          items: items.map((it) => ({
            productName: it.productName.trim(),
            boxes: Number(it.boxes),
            bottlesPerBox: Number(it.bottlesPerBox),
          })),
        }),
      });

      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }

      const data = (await res.json().catch(() => null)) as any;

      if (!res.ok) {
        if (data?.errors && typeof data.errors === "object") {
          setErrors(data.errors as FieldErrors);
        } else {
          setErrors({ poNumber: "Could not save order. Please try again." });
        }
        return;
      }

      setSuccessId(String(data?.id ?? ""));
      setPoNumber("");
      setCustomerName("");
      setItems([emptyRow()]);
      setErrors({});
    } finally {
      setSubmitting(false);
    }
  }

  function addItem() {
    setItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        catalogCode: "",
        productName: "",
        boxes: "",
        bottlesPerBox: "10",
        useDefaultPacking: true,
      },
    ]);
  }

  function removeItem(id: string) {
    setItems((prev) => (prev.length <= 1 ? prev : prev.filter((x) => x.id !== id)));
  }

  if (successId) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-zinc-900">Order created</h1>
        <p className="mt-1 text-sm text-zinc-600">Saved successfully.</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Link
            href={`/orders/${successId}/loading-sheet`}
            className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white"
          >
            View loading sheet
          </Link>
          <Link
            href="/orders"
            className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-zinc-900 shadow-sm ring-1 ring-zinc-200"
          >
            All orders
          </Link>
          <button
            type="button"
            onClick={() => setSuccessId(null)}
            className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-zinc-900 shadow-sm ring-1 ring-zinc-200"
          >
            Create another
          </button>
        </div>
      </div>
    );
  }

  const bpbLocked = (row: ItemRow): boolean =>
    Boolean(
      row.useDefaultPacking &&
        row.catalogCode &&
        row.catalogCode !== CUSTOM_CODE &&
        catalogByCode.get(row.catalogCode),
    );

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h1 className="text-lg font-semibold text-zinc-900">New Order</h1>
      <p className="mt-1 text-sm text-zinc-600">
        Pick a product to auto-fill <strong>bottles per carton</strong>. Use <strong>Custom bottles/carton</strong> for samples (e.g. 1 bottle). Each carton = one row on the loading sheet.
      </p>

      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <div>
          <label className="block text-sm font-medium text-zinc-800" htmlFor="poNumber">
            PO number
          </label>
          <input
            id="poNumber"
            value={poNumber}
            onChange={(e) => setPoNumber(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") customerRef.current?.focus();
            }}
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
          />
          {errors.poNumber ? <div className="mt-1 text-sm text-red-700">{errors.poNumber}</div> : null}
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-800" htmlFor="customerName">
            Customer name
          </label>
          <input
            id="customerName"
            ref={customerRef}
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") firstSelectRef.current?.focus();
            }}
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
          />
          {errors.customerName ? (
            <div className="mt-1 text-sm text-red-700">{errors.customerName}</div>
          ) : null}
        </div>

        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-zinc-900">Products</div>
              <div className="mt-0.5 text-xs text-zinc-600">
                {catalogLoading ? "Loading catalog…" : `${catalog.length} packings in catalog.`}
              </div>
            </div>
            <button
              type="button"
              onClick={addItem}
              className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-zinc-900 shadow-sm ring-1 ring-zinc-200"
            >
              + Add product
            </button>
          </div>

          {errors.items ? <div className="mt-3 text-sm text-red-700">{errors.items}</div> : null}

          <div className="mt-4 space-y-4">
            {items.map((it, idx) => (
              <div key={it.id} className="rounded-lg border border-zinc-200 bg-white p-3 md:p-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
                  <div className="md:col-span-6">
                    <label className="block text-sm font-medium text-zinc-800" htmlFor={`catalog-${it.id}`}>
                      Product
                    </label>
                    <select
                      id={`catalog-${it.id}`}
                      ref={idx === 0 ? firstSelectRef : undefined}
                      value={it.catalogCode}
                      disabled={catalogLoading}
                      onChange={(e) => onCatalogChange(it.id, e.target.value)}
                      className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400"
                    >
                      <option value="">{catalogLoading ? "Loading…" : "Choose product…"}</option>
                      {catalog.map((p) => (
                        <option key={p.code} value={p.code}>
                          {p.name} ({p.bottlesPerCarton}/carton)
                        </option>
                      ))}
                      <option value={CUSTOM_CODE}>Other (type name)…</option>
                    </select>
                    {errors[`items.${idx}.catalog`] ? (
                      <div className="mt-1 text-sm text-red-700">{errors[`items.${idx}.catalog`]}</div>
                    ) : null}

                    {it.catalogCode === CUSTOM_CODE || (it.catalogCode && errors[`items.${idx}.productName`]) ? (
                      <div className="mt-2">
                        <label className="sr-only" htmlFor={`name-${it.id}`}>
                          Product name
                        </label>
                        <input
                          id={`name-${it.id}`}
                          value={it.productName}
                          onChange={(e) => {
                            const v = e.target.value;
                            setItems((prev) => prev.map((x) => (x.id === it.id ? { ...x, productName: v } : x)));
                          }}
                          placeholder="Exact name for loading sheet"
                          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
                        />
                        {errors[`items.${idx}.productName`] ? (
                          <div className="mt-1 text-sm text-red-700">{errors[`items.${idx}.productName`]}</div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-zinc-800" htmlFor={`boxes-${it.id}`}>
                      Cartons
                    </label>
                    <input
                      id={`boxes-${it.id}`}
                      inputMode="numeric"
                      value={it.boxes}
                      onChange={(e) => {
                        const v = e.target.value;
                        setItems((prev) => prev.map((x) => (x.id === it.id ? { ...x, boxes: v } : x)));
                      }}
                      className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
                      placeholder="e.g. 10"
                    />
                    {errors[`items.${idx}.boxes`] ? (
                      <div className="mt-1 text-sm text-red-700">{errors[`items.${idx}.boxes`]}</div>
                    ) : null}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-zinc-800" htmlFor={`bpb-${it.id}`}>
                      Bottles / carton
                    </label>
                    <input
                      id={`bpb-${it.id}`}
                      inputMode="numeric"
                      value={it.bottlesPerBox}
                      readOnly={bpbLocked(it)}
                      onChange={(e) => {
                        const v = e.target.value;
                        setItems((prev) => prev.map((x) => (x.id === it.id ? { ...x, bottlesPerBox: v } : x)));
                      }}
                      className={`mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400 ${
                        bpbLocked(it) ? "cursor-not-allowed bg-zinc-100 text-zinc-600" : "bg-white"
                      }`}
                      placeholder="10"
                    />
                    {errors[`items.${idx}.bottlesPerBox`] ? (
                      <div className="mt-1 text-sm text-red-700">{errors[`items.${idx}.bottlesPerBox`]}</div>
                    ) : null}
                  </div>

                  <div className="md:col-span-2 md:flex md:flex-col md:justify-end">
                    <button
                      type="button"
                      onClick={() => removeItem(it.id)}
                      disabled={items.length <= 1}
                      className="w-full rounded-lg bg-white px-3 py-2 text-sm font-medium text-zinc-900 shadow-sm ring-1 ring-zinc-200 disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                </div>

                {it.catalogCode && it.catalogCode !== CUSTOM_CODE ? (
                  <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-zinc-700">
                    <input
                      type="checkbox"
                      checked={!it.useDefaultPacking}
                      onChange={(e) => setUseDefaultPacking(it.id, !e.target.checked)}
                      className="rounded border-zinc-300"
                    />
                    <span>Custom bottles per carton (e.g. sample: set to 1)</span>
                  </label>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={!canSubmit || submitting || catalogLoading}
          className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {submitting ? "Saving…" : "Create order"}
        </button>
      </form>
    </div>
  );
}
