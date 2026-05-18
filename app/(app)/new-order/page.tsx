"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  NewOrderProductGrid,
  defaultGridRow,
  makeOtherRow,
  otherRowIsActive,
  rowIsActive,
  type CatalogProduct,
  type GridErrors,
  type GridState,
  type OtherRow,
} from "@/components/NewOrderProductGrid";

type FieldErrors = Partial<Record<"poNumber" | "customerName" | "items", string>> &
  Record<string, string>;

export default function NewOrderPage() {
  const [poNumber, setPoNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [city, setCity] = useState("");
  const [deadlineDate, setDeadlineDate] = useState("");
  const [grid, setGrid] = useState<GridState>({});
  const [otherRows, setOtherRows] = useState<OtherRow[]>([]);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<CatalogProduct[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const customerRef = useRef<HTMLInputElement | null>(null);
  const firstGridInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/products", { credentials: "same-origin" });
        const data = (await res.json()) as
          | { products?: CatalogProduct[] }
          | CatalogProduct[];
        const list = Array.isArray(data)
          ? data
          : Array.isArray(data.products)
            ? data.products
            : [];
        if (!cancelled) {
          setCatalog(list);
          setGrid((prev) => {
            const next: GridState = { ...prev };
            for (const p of list) {
              if (!next[p.code]) {
                next[p.code] = defaultGridRow(p.bottlesPerCarton);
              }
            }
            return next;
          });
        }
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

  const catalogByCode = useMemo(
    () => new Map(catalog.map((p) => [p.code, p])),
    [catalog],
  );

  const activeCount = useMemo(() => {
    let n = 0;
    for (const p of catalog) {
      const row = grid[p.code];
      if (row && rowIsActive(row)) n += 1;
    }
    for (const r of otherRows) {
      if (otherRowIsActive(r)) n += 1;
    }
    return n;
  }, [catalog, grid, otherRows]);

  const canSubmit = useMemo(
    () => Boolean(poNumber.trim() && customerName.trim() && activeCount > 0),
    [activeCount, customerName, poNumber],
  );

  function validate(): FieldErrors {
    const next: FieldErrors = {};
    if (!poNumber.trim()) next.poNumber = "PO number is required.";
    if (!customerName.trim()) next.customerName = "Customer name is required.";

    let validCount = 0;
    for (const p of catalog) {
      const row = grid[p.code];
      if (!row) continue;
      const cartonsRaw = row.cartons.trim();
      if (!cartonsRaw) continue;

      const cartons = Number(cartonsRaw);
      const bpb = Number(row.bottlesPerBox);
      if (!Number.isInteger(cartons) || cartons < 1) {
        next[`item.${p.code}.cartons`] = "Must be an integer ≥ 1.";
      }
      if (!row.bottlesPerBox.trim()) {
        next[`item.${p.code}.bottlesPerBox`] = "Required.";
      } else if (!Number.isInteger(bpb) || bpb < 1) {
        next[`item.${p.code}.bottlesPerBox`] = "Must be an integer ≥ 1.";
      }

      if (
        Number.isInteger(cartons) &&
        cartons >= 1 &&
        Number.isInteger(bpb) &&
        bpb >= 1
      ) {
        validCount += 1;
      }
    }

    otherRows.forEach((r) => {
      const hasName = r.productName.trim().length > 0;
      const cartonsRaw = r.cartons.trim();
      if (!hasName && !cartonsRaw) return;

      const cartons = Number(cartonsRaw);
      const bpb = Number(r.bottlesPerBox);
      if (!hasName) next[`item.${r.code}.productName`] = "Product name is required.";
      if (!cartonsRaw) {
        next[`item.${r.code}.cartons`] = "Cartons is required.";
      } else if (!Number.isInteger(cartons) || cartons < 1) {
        next[`item.${r.code}.cartons`] = "Must be an integer ≥ 1.";
      }
      if (!r.bottlesPerBox.trim()) {
        next[`item.${r.code}.bottlesPerBox`] = "Required.";
      } else if (!Number.isInteger(bpb) || bpb < 1) {
        next[`item.${r.code}.bottlesPerBox`] = "Must be an integer ≥ 1.";
      }

      if (
        hasName &&
        Number.isInteger(cartons) &&
        cartons >= 1 &&
        Number.isInteger(bpb) &&
        bpb >= 1
      ) {
        validCount += 1;
      }
    });

    if (validCount === 0) {
      next.items = "Enter cartons for at least one product.";
    }
    return next;
  }

  function onCartonsChange(code: string, value: string) {
    setGrid((prev) => {
      const existing = prev[code] ?? {
        cartons: "",
        bottlesPerBox: "10",
        useDefaultPacking: true,
      };
      return { ...prev, [code]: { ...existing, cartons: value } };
    });
  }

  function onBottlesPerBoxChange(code: string, value: string) {
    setGrid((prev) => {
      const existing = prev[code] ?? {
        cartons: "",
        bottlesPerBox: "10",
        useDefaultPacking: false,
      };
      return { ...prev, [code]: { ...existing, bottlesPerBox: value } };
    });
  }

  function onUseDefaultPackingChange(code: string, useDefault: boolean) {
    setGrid((prev) => {
      const p = catalogByCode.get(code);
      const existing = prev[code] ?? {
        cartons: "",
        bottlesPerBox: p ? String(p.bottlesPerCarton) : "10",
        useDefaultPacking: true,
      };
      return {
        ...prev,
        [code]: {
          ...existing,
          useDefaultPacking: useDefault,
          bottlesPerBox: useDefault && p ? String(p.bottlesPerCarton) : existing.bottlesPerBox,
        },
      };
    });
  }

  function onOtherChange(code: string, patch: Partial<OtherRow>) {
    setOtherRows((prev) => prev.map((r) => (r.code === code ? { ...r, ...patch } : r)));
  }

  function onAddOther() {
    setOtherRows((prev) => [...prev, makeOtherRow()]);
  }

  function onRemoveOther(code: string) {
    setOtherRows((prev) => prev.filter((r) => r.code !== code));
  }

  function buildSubmitItems(): Array<{
    productName: string;
    boxes: number;
    bottlesPerBox: number;
  }> {
    const out: Array<{ productName: string; boxes: number; bottlesPerBox: number }> = [];
    for (const p of catalog) {
      const row = grid[p.code];
      if (!row) continue;
      const cartons = Number(row.cartons);
      const bpb = Number(row.bottlesPerBox);
      if (!Number.isInteger(cartons) || cartons < 1) continue;
      if (!Number.isInteger(bpb) || bpb < 1) continue;
      out.push({ productName: p.name, boxes: cartons, bottlesPerBox: bpb });
    }
    for (const r of otherRows) {
      const cartons = Number(r.cartons);
      const bpb = Number(r.bottlesPerBox);
      const pn = r.productName.trim();
      if (!pn) continue;
      if (!Number.isInteger(cartons) || cartons < 1) continue;
      if (!Number.isInteger(bpb) || bpb < 1) continue;
      out.push({ productName: pn, boxes: cartons, bottlesPerBox: bpb });
    }
    return out;
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
          city: city.trim(),
          deadlineDate: deadlineDate.trim() || undefined,
          items: buildSubmitItems(),
        }),
      });

      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }

      const data = (await res.json().catch(() => null)) as { id?: string; errors?: Record<string, string> } | null;

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
      setCity("");
      setDeadlineDate("");
      setGrid(() => {
        const next: GridState = {};
        for (const p of catalog) next[p.code] = defaultGridRow(p.bottlesPerCarton);
        return next;
      });
      setOtherRows([]);
      setErrors({});
    } finally {
      setSubmitting(false);
    }
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

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h1 className="text-lg font-semibold text-zinc-900">New Order</h1>
      <p className="mt-1 text-sm text-zinc-600">
        Every catalog product is listed below. Type the number of <strong>cartons</strong> next to
        each product you want on this order — leave the rest blank. Use{" "}
        <strong>Sample / custom</strong> if a product ships with non-standard bottles per carton.
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
              if (e.key === "Enter") firstGridInputRef.current?.focus();
            }}
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
          />
          {errors.customerName ? (
            <div className="mt-1 text-sm text-red-700">{errors.customerName}</div>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-zinc-800" htmlFor="city">
              City
            </label>
            <input
              id="city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. LAHORE"
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-800" htmlFor="deadlineDate">
              Deadline date
            </label>
            <input
              id="deadlineDate"
              type="date"
              value={deadlineDate}
              onChange={(e) => setDeadlineDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
            />
          </div>
        </div>

        <NewOrderProductGrid
          catalog={catalog}
          catalogLoading={catalogLoading}
          state={grid}
          otherRows={otherRows}
          errors={errors as GridErrors}
          itemsError={errors.items}
          firstInputRef={firstGridInputRef}
          onCartonsChange={onCartonsChange}
          onBottlesPerBoxChange={onBottlesPerBoxChange}
          onUseDefaultPackingChange={onUseDefaultPackingChange}
          onOtherChange={onOtherChange}
          onAddOther={onAddOther}
          onRemoveOther={onRemoveOther}
        />

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
