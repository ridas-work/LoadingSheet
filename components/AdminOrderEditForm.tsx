"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { isCustomBottleSizeCode, normalizeBottleSizeCode } from "@/lib/customBottleSizes";
import {
  CustomCartonBuilder,
  buildCustomCartonsPayload,
  draftsFromSavedCartons,
  emptyCartonDraft,
  resolvedCustomRowProductName,
  type CustomCartonDraft,
} from "@/components/CustomCartonBuilder";
import { catalogForCustomCartonBuilder } from "@/lib/customCartonProducts";
import { assertValidCustomBoxCode } from "@/lib/customCartonBoxes";
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

type FieldErrors = Partial<
  Record<"poNumber" | "customerName" | "items" | "mixedSample" | "mixedBoxCount", string>
> &
  Record<string, string>;

type OrderKind = "standard" | "mixed_sample";

export type AdminOrderInitial = {
  orderId: string;
  poNumber: string;
  customerName: string;
  city: string;
  deadlineDate: string;
  orderKind: OrderKind;
  mixedBoxCount: number;
  standardItems: Array<{ productName: string; boxes: number; bottlesPerBox: number }>;
  mixedContents: Array<{ productName: string; bottles: number }>;
  customCartons: Array<{
    boxCount: number;
    contents: Array<{ productName: string; bottles: number; bottleSizeCode?: string }>;
    label?: string;
    customBoxCode?: string;
  }>;
  hasBatchAssignments: boolean;
  onDispatchTrip: boolean;
  createdByName: string;
};

function hydrateGrid(
  catalog: CatalogProduct[],
  initial: AdminOrderInitial,
): { grid: GridState; otherRows: OtherRow[] } {
  const grid: GridState = {};
  for (const p of catalog) {
    grid[p.code] = defaultGridRow(p.bottlesPerCarton);
  }
  const otherRows: OtherRow[] = [];

  const entries =
    initial.orderKind === "mixed_sample"
      ? initial.mixedContents.map((c) => ({
          productName: c.productName,
          qty: c.bottles,
          bottlesPerBox: 1,
        }))
      : initial.standardItems.map((i) => ({
          productName: i.productName,
          qty: i.boxes,
          bottlesPerBox: i.bottlesPerBox,
        }));

  for (const entry of entries) {
    const key = entry.productName.trim().toLowerCase();
    const cat = catalog.find((p) => p.name.trim().toLowerCase() === key);
    if (cat) {
      grid[cat.code] = {
        cartons: String(entry.qty),
        bottlesPerBox: String(entry.bottlesPerBox),
        useDefaultPacking: entry.bottlesPerBox === cat.bottlesPerCarton,
      };
    } else {
      otherRows.push({
        code: makeOtherRow().code,
        productName: entry.productName,
        cartons: String(entry.qty),
        bottlesPerBox: String(entry.bottlesPerBox),
      });
    }
  }

  return { grid, otherRows };
}

export function AdminOrderEditForm({ initial }: { initial: AdminOrderInitial }) {
  const router = useRouter();
  const [poNumber, setPoNumber] = useState(initial.poNumber);
  const [customerName, setCustomerName] = useState(initial.customerName);
  const [city, setCity] = useState(initial.city);
  const [deadlineDate, setDeadlineDate] = useState(initial.deadlineDate);
  const [orderKind, setOrderKind] = useState<OrderKind>(initial.orderKind);
  const [mixedBoxCount, setMixedBoxCount] = useState(String(initial.mixedBoxCount || 1));
  const [grid, setGrid] = useState<GridState>({});
  const [otherRows, setOtherRows] = useState<OtherRow[]>([]);
  const [customCartons, setCustomCartons] = useState<CustomCartonDraft[]>([]);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [catalog, setCatalog] = useState<CatalogProduct[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const customerRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/products", { credentials: "same-origin" });
        const data = (await res.json()) as { products?: CatalogProduct[] } | CatalogProduct[];
        const list = Array.isArray(data)
          ? data
          : Array.isArray(data.products)
            ? data.products
            : [];
        if (!cancelled) {
          setCatalog(list);
          const { grid: g, otherRows: o } = hydrateGrid(list, initial);
          setGrid(g);
          setOtherRows(o);
          if (initial.customCartons?.length) {
            setCustomCartons(
              draftsFromSavedCartons(initial.customCartons, catalogForCustomCartonBuilder(list)),
            );
          } else {
            setCustomCartons([]);
          }
          setHydrated(true);
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
  }, [initial]);

  const isMixed = orderKind === "mixed_sample";

  const customBoxCatalog = useMemo(
    () => catalogForCustomCartonBuilder(catalog),
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

  function validate(): FieldErrors {
    const next: FieldErrors = {};
    if (!poNumber.trim()) next.poNumber = "PO number is required.";
    if (!customerName.trim()) next.customerName = "Customer name is required.";
    if (isMixed) {
      const boxes = Number(mixedBoxCount);
      if (!mixedBoxCount.trim()) next.mixedBoxCount = "Number of mixed boxes is required.";
      else if (!Number.isInteger(boxes) || boxes < 1) next.mixedBoxCount = "Must be an integer ≥ 1.";
    }
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
      if (!isMixed && (!Number.isInteger(bpb) || bpb < 1)) {
        next[`item.${p.code}.bottlesPerBox`] = "Must be an integer ≥ 1.";
      }
      const qtyOk = Number.isInteger(cartons) && cartons >= 1;
      const bpbOk = isMixed || (Number.isInteger(bpb) && bpb >= 1);
      if (qtyOk && bpbOk) validCount += 1;
    }
    otherRows.forEach((r) => {
      const hasName = r.productName.trim().length > 0;
      const cartonsRaw = r.cartons.trim();
      if (!hasName && !cartonsRaw) return;
      const cartons = Number(cartonsRaw);
      const bpb = Number(r.bottlesPerBox);
      if (!hasName) next[`item.${r.code}.productName`] = "Product name is required.";
      if (!cartonsRaw || !Number.isInteger(cartons) || cartons < 1) {
        next[`item.${r.code}.cartons`] = "Must be an integer ≥ 1.";
      }
      if (!isMixed && (!Number.isInteger(bpb) || bpb < 1)) {
        next[`item.${r.code}.bottlesPerBox`] = "Must be an integer ≥ 1.";
      }
      const qtyOk = hasName && Number.isInteger(cartons) && cartons >= 1;
      const bpbOk = isMixed || (Number.isInteger(bpb) && bpb >= 1);
      if (qtyOk && bpbOk) validCount += 1;
    });
    if (validCount === 0) {
      if (isMixed) {
        next.items = "Enter bottles for at least one product in the mixed box.";
      } else if (buildCustomCartonsPayload(customCartons, customBoxCatalog).length === 0) {
        next.items = "Enter cartons for at least one product, or add a custom carton.";
      }
    }

    if (!isMixed && customCartons.length > 0) {
      customCartons.forEach((c, ci) => {
        const bc = Number(c.boxCount);
        if (!c.boxCount.trim() || !Number.isInteger(bc) || bc < 1) {
          next[`customCartons.${ci}.boxCount`] = "Must be an integer ≥ 1.";
        }
        let any = false;
        c.rows.forEach((r, ri) => {
          const pn = resolvedCustomRowProductName(r, customBoxCatalog);
          const b = Number(r.bottles);
          if (!pn && !r.bottles.trim()) return;
          if (!pn) next[`customCartons.${ci}.rows.${ri}.productName`] = "Product name is required.";
          if (!r.bottles.trim() || !Number.isInteger(b) || b < 1) {
            next[`customCartons.${ci}.rows.${ri}.bottles`] = "Bottles must be an integer ≥ 1.";
          }
          if (pn && Number.isInteger(b) && b >= 1) any = true;
        });
        if (!any) next[`customCartons.${ci}.contents`] = "Add at least one product line with bottles.";
        c.rows.forEach((r, ri) => {
          const code = normalizeBottleSizeCode(r.bottleSizeCode);
          if (code && code !== "catalog" && !isCustomBottleSizeCode(code)) {
            next[`customCartons.${ci}.rows.${ri}.bottleSizeCode`] = "Invalid container size.";
          }
        });
        const boxErr = assertValidCustomBoxCode(c.customBoxCode);
        if (boxErr) next[`customCartons.${ci}.customBoxCode`] = boxErr;
      });
    }

    return next;
  }

  function buildMixedContents() {
    const out: Array<{ productName: string; bottles: number }> = [];
    for (const p of catalog) {
      const row = grid[p.code];
      if (!row) continue;
      const bottles = Number(row.cartons);
      if (!Number.isInteger(bottles) || bottles < 1) continue;
      out.push({ productName: p.name, bottles });
    }
    for (const r of otherRows) {
      const bottles = Number(r.cartons);
      const pn = r.productName.trim();
      if (!pn || !Number.isInteger(bottles) || bottles < 1) continue;
      out.push({ productName: pn, bottles });
    }
    return out;
  }

  function buildSubmitItems() {
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
      if (!pn || !Number.isInteger(cartons) || cartons < 1) continue;
      if (!Number.isInteger(bpb) || bpb < 1) continue;
      out.push({ productName: pn, boxes: cartons, bottlesPerBox: bpb });
    }
    return out;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/orders/${initial.orderId}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
          isMixed
            ? {
                poNumber: poNumber.trim(),
                customerName: customerName.trim(),
                city: city.trim(),
                deadlineDate: deadlineDate.trim() || undefined,
                orderKind: "mixed_sample",
                mixedSample: {
                  boxCount: Number(mixedBoxCount),
                  contents: buildMixedContents(),
                },
              }
            : {
                poNumber: poNumber.trim(),
                customerName: customerName.trim(),
                city: city.trim(),
                deadlineDate: deadlineDate.trim() || undefined,
                orderKind: "standard",
                items: buildSubmitItems(),
                customCartons: buildCustomCartonsPayload(customCartons, customBoxCatalog),
              },
        ),
      });

      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (res.status === 403) {
        setErrors({ poNumber: "You do not have permission to edit orders." });
        return;
      }

      const data = (await res.json().catch(() => null)) as {
        id?: string;
        errors?: Record<string, string>;
      } | null;

      if (!res.ok) {
        if (data?.errors) setErrors(data.errors as FieldErrors);
        else setErrors({ poNumber: "Could not save changes." });
        return;
      }

      const pendingId = (data as { pendingSubtractionOrderId?: string | null } | null)?.pendingSubtractionOrderId ?? null;
      if (pendingId) {
        router.push("/admin/approvals?subtractionQueued=1#po-order-approval");
      } else {
        router.push(`/orders/${initial.orderId}/loading-sheet`);
      }
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  const customPayloadLen = useMemo(
    () => buildCustomCartonsPayload(customCartons, customBoxCatalog).length,
    [customBoxCatalog, customCartons],
  );

  const legacyCustomCartonMissingOuterBox = useMemo(
    () =>
      !isMixed &&
      customCartons.some((c) => {
        const bc = Number(c.boxCount);
        if (!c.boxCount.trim() || !Number.isInteger(bc) || bc < 1) return false;
        const hasContents = c.rows.some((r) => {
          const pn = resolvedCustomRowProductName(r, customBoxCatalog);
          const b = Number(r.bottles);
          return Boolean(pn && Number.isInteger(b) && b >= 1);
        });
        return hasContents && !c.customBoxCode.trim();
      }),
    [customBoxCatalog, customCartons, isMixed],
  );

  const gridHandlers = {
    onCartonsChange: (code: string, value: string) =>
      setGrid((prev) => ({
        ...prev,
        [code]: { ...(prev[code] ?? defaultGridRow(10)), cartons: value },
      })),
    onBottlesPerBoxChange: (code: string, value: string) =>
      setGrid((prev) => ({
        ...prev,
        [code]: { ...(prev[code] ?? defaultGridRow(10)), bottlesPerBox: value, useDefaultPacking: false },
      })),
    onUseDefaultPackingChange: (code: string, useDefault: boolean) => {
      const p = catalog.find((c) => c.code === code);
      setGrid((prev) => ({
        ...prev,
        [code]: {
          ...(prev[code] ?? defaultGridRow(10)),
          useDefaultPacking: useDefault,
          bottlesPerBox: useDefault && p ? String(p.bottlesPerCarton) : prev[code]?.bottlesPerBox ?? "10",
        },
      }));
    },
    onOtherChange: (code: string, patch: Partial<OtherRow>) =>
      setOtherRows((prev) => prev.map((r) => (r.code === code ? { ...r, ...patch } : r))),
    onAddOther: () => setOtherRows((prev) => [...prev, makeOtherRow()]),
    onRemoveOther: (code: string) => setOtherRows((prev) => prev.filter((r) => r.code !== code)),
  };

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h1 className="text-lg font-semibold text-zinc-900">Edit order</h1>
      <p className="mt-1 text-sm text-zinc-600">
        Boss-only correction for PO details and product quantities. Originally entered by{" "}
        <strong>{initial.createdByName || "—"}</strong>.
      </p>

      {initial.hasBatchAssignments ? (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          This order has batch assignments on the loading sheet. Matching rows keep their batch
          numbers; new or changed rows need Rashid to assign batches again.
        </p>
      ) : null}
      {initial.onDispatchTrip ? (
        <p className="mt-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
          This order is on a vehicle trip. Check the loading sheet after saving.
        </p>
      ) : null}

      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
          <div className="text-sm font-medium text-zinc-900">Order type</div>
          <div className="mt-2 flex flex-wrap gap-4">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                checked={orderKind === "standard"}
                onChange={() => setOrderKind("standard")}
              />
              Standard
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                checked={orderKind === "mixed_sample"}
                onChange={() => {
                  setOrderKind("mixed_sample");
                  setCustomCartons([]);
                }}
              />
              Mixed sample box
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium" htmlFor="poNumber">
            PO number
          </label>
          <input
            id="poNumber"
            value={poNumber}
            onChange={(e) => setPoNumber(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          />
          {errors.poNumber ? <p className="mt-1 text-sm text-red-700">{errors.poNumber}</p> : null}
        </div>

        <div>
          <label className="block text-sm font-medium" htmlFor="customerName">
            Customer name
          </label>
          <input
            id="customerName"
            ref={customerRef}
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          />
          {errors.customerName ? (
            <p className="mt-1 text-sm text-red-700">{errors.customerName}</p>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium" htmlFor="city">
              City
            </label>
            <input
              id="city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium" htmlFor="deadlineDate">
              Deadline
            </label>
            <input
              id="deadlineDate"
              type="date"
              value={deadlineDate}
              onChange={(e) => setDeadlineDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            />
          </div>
        </div>

        {isMixed ? (
          <div>
            <label className="block text-sm font-medium" htmlFor="mixedBoxCount">
              Number of mixed boxes
            </label>
            <input
              id="mixedBoxCount"
              inputMode="numeric"
              value={mixedBoxCount}
              onChange={(e) => setMixedBoxCount(e.target.value)}
              className="mt-1 w-32 rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            />
            {errors.mixedBoxCount ? (
              <p className="mt-1 text-sm text-red-700">{errors.mixedBoxCount}</p>
            ) : null}
          </div>
        ) : null}

        {hydrated && !catalogLoading ? (
          <NewOrderProductGrid
            catalog={catalog}
            catalogLoading={false}
            mode={isMixed ? "bottles" : "cartons"}
            state={grid}
            otherRows={otherRows}
            errors={errors as GridErrors}
            itemsError={errors.items}
            {...gridHandlers}
          />
        ) : (
          <p className="text-sm text-zinc-500">Loading product catalog…</p>
        )}

        {!isMixed && customCartons.length === 0 ? (
          <button
            type="button"
            onClick={() => setCustomCartons([emptyCartonDraft()])}
            className="rounded-lg border border-dashed border-zinc-400 bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-100"
          >
            + Add custom carton
          </button>
        ) : null}

        {!isMixed && customCartons.length > 0 ? (
          <>
            {legacyCustomCartonMissingOuterBox ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                One or more custom cartons are missing an outer box size. Select outer box size before the next
                delivery.
              </p>
            ) : null}
            <CustomCartonBuilder
              cartons={customCartons}
              onChange={setCustomCartons}
              disabled={submitting}
              errors={errors}
              catalogProducts={customBoxCatalog}
            />
          </>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={submitting || catalogLoading || (activeCount === 0 && customPayloadLen === 0)}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {submitting ? "Saving…" : "Save changes"}
          </button>
          <Link
            href={`/orders/${initial.orderId}/loading-sheet`}
            className="rounded-lg bg-white px-4 py-2 text-sm font-medium ring-1 ring-zinc-200"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
