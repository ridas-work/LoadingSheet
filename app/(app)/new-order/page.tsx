"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import type { SerializedTicket } from "@/lib/fieldVisitTickets";

import { isCustomBottleSizeCode, normalizeBottleSizeCode } from "@/lib/customBottleSizes";
import {
  CustomCartonBuilder,
  buildCustomCartonsPayload,
  emptyCartonDraft,
  resolvedCustomRowProductName,
  type CustomCartonDraft,
} from "@/components/CustomCartonBuilder";
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
import { catalogForCustomCartonBuilder } from "@/lib/customCartonProducts";
import { bottlesToStandardCartons } from "@/lib/poBottleEntry";

type FieldErrors = Partial<Record<"poNumber" | "customerName" | "items", string>> &
  Record<string, string>;

export default function NewOrderPage() {
  const searchParams = useSearchParams();
  const [poNumber, setPoNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [city, setCity] = useState("");
  const [visitTicketId, setVisitTicketId] = useState("");
  const [visitTickets, setVisitTickets] = useState<SerializedTicket[]>([]);
  const [deadlineDate, setDeadlineDate] = useState("");
  const [grid, setGrid] = useState<GridState>({});
  const [otherRows, setOtherRows] = useState<OtherRow[]>([]);
  const [customCartons, setCustomCartons] = useState<CustomCartonDraft[]>([]);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<CatalogProduct[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const customerRef = useRef<HTMLInputElement | null>(null);
  const firstGridInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const qVisit = searchParams.get("visitTicketId") ?? "";
    const qCustomer = searchParams.get("customerName") ?? "";
    const qCity = searchParams.get("city") ?? "";
    if (qVisit) setVisitTicketId(qVisit);
    if (qCustomer) setCustomerName(decodeURIComponent(qCustomer));
    if (qCity) setCity(decodeURIComponent(qCity));
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/field-visits", { credentials: "same-origin" });
        if (res.ok) {
          const data = (await res.json()) as { tickets?: SerializedTicket[] };
          const awaiting = (data.tickets ?? []).filter((t) => t.status === "visit_concluded");
          if (!cancelled) setVisitTickets(awaiting);
        }
      } catch {
        if (!cancelled) setVisitTickets([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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

  const invalidFilledCount = useMemo(() => {
    let n = 0;
    for (const p of catalog) {
      const row = grid[p.code];
      if (!row || !rowIsActive(row)) continue;
      const bottles = Number(row.cartons);
      if (!Number.isInteger(bottles) || bottles < 1) {
        n += 1;
        continue;
      }
      const perCarton = row.useDefaultPacking ? p.bottlesPerCarton : Number(row.bottlesPerBox);
      if (!bottlesToStandardCartons(bottles, perCarton, p.name).ok) n += 1;
    }
    for (const r of otherRows) {
      if (!otherRowIsActive(r)) continue;
      const bottles = Number(r.cartons);
      const bpb = Number(r.bottlesPerBox);
      if (!Number.isInteger(bottles) || bottles < 1 || !Number.isInteger(bpb) || bpb < 1) {
        n += 1;
        continue;
      }
      if (!bottlesToStandardCartons(bottles, bpb, r.productName.trim()).ok) n += 1;
    }
    return n;
  }, [catalog, grid, otherRows]);

  const customCartonPayload = useMemo(
    () => buildCustomCartonsPayload(customCartons, customBoxCatalog),
    [customBoxCatalog, customCartons],
  );

  const submitBlockReason = useMemo(() => {
    if (catalogLoading) return "Loading product catalog…";
    if (!poNumber.trim()) return "Enter a PO number above.";
    if (!customerName.trim()) return "Enter a customer name above.";
    if (activeCount === 0 && customCartonPayload.length === 0) {
      return "Enter bottles for at least one product, or add a custom carton.";
    }
    if (invalidFilledCount > 0) {
      return `${invalidFilledCount} product${invalidFilledCount === 1 ? "" : "s"} need full-carton bottle counts — scroll the list or use Add custom carton.`;
    }
    if (customCartons.length > 0) {
      for (let ci = 0; ci < customCartons.length; ci++) {
        const c = customCartons[ci];
        const bc = Number(c.boxCount);
        if (!c.boxCount.trim() || !Number.isInteger(bc) || bc < 1) {
          return `Custom carton ${ci + 1}: enter how many cartons (e.g. 1) in the number field — put names like "FOC rhino 500ml" in Label on sheet.`;
        }
        let any = false;
        for (const r of c.rows) {
          const pn = resolvedCustomRowProductName(r, customBoxCatalog);
          const b = Number(r.bottles);
          if (pn && Number.isInteger(b) && b >= 1) any = true;
        }
        if (!any) {
          return `Custom carton ${ci + 1}: add at least one product with bottles.`;
        }
      }
    }
    return null;
  }, [
    activeCount,
    customBoxCatalog,
    catalogLoading,
    customCartonPayload.length,
    customCartons,
    customerName,
    invalidFilledCount,
    poNumber,
  ]);

  const canSubmit = submitBlockReason === null;

  function validate(): FieldErrors {
    const next: FieldErrors = {};
    if (!poNumber.trim()) next.poNumber = "PO number is required.";
    if (!customerName.trim()) next.customerName = "Customer name is required.";

    let validCount = 0;
    for (const p of catalog) {
      const row = grid[p.code];
      if (!row) continue;
      const qtyRaw = row.cartons.trim();
      if (!qtyRaw) continue;

      const bottles = Number(qtyRaw);
      const bpb = Number(row.bottlesPerBox);
      if (!Number.isInteger(bottles) || bottles < 1) {
        next[`item.${p.code}.cartons`] = "Enter whole bottles (1 or more).";
      } else {
        const perCarton = row.useDefaultPacking ? p.bottlesPerCarton : bpb;
        if (!row.useDefaultPacking) {
          if (!row.bottlesPerBox.trim()) {
            next[`item.${p.code}.bottlesPerBox`] = "Bottles per carton required for custom packing.";
          } else if (!Number.isInteger(bpb) || bpb < 1) {
            next[`item.${p.code}.bottlesPerBox`] = "Must be an integer ≥ 1.";
          }
        }
        const resolved = bottlesToStandardCartons(bottles, perCarton, p.name);
        if (!resolved.ok) {
          next[`item.${p.code}.cartons`] = resolved.message.replace(/\*\*/g, "");
        }
      }

      const qtyOk = Number.isInteger(bottles) && bottles >= 1;
      const bpbOk =
        row.useDefaultPacking || (Number.isInteger(bpb) && bpb >= 1);
      const cartonOk =
        qtyOk &&
        bpbOk &&
        bottlesToStandardCartons(
          bottles,
          row.useDefaultPacking ? p.bottlesPerCarton : bpb,
          p.name,
        ).ok;
      if (qtyOk && bpbOk && cartonOk) validCount += 1;
    }

    otherRows.forEach((r) => {
      const hasName = r.productName.trim().length > 0;
      const qtyRaw = r.cartons.trim();
      if (!hasName && !qtyRaw) return;

      const bottles = Number(qtyRaw);
      const bpb = Number(r.bottlesPerBox);
      if (!hasName) next[`item.${r.code}.productName`] = "Product name is required.";
      if (!qtyRaw) {
        next[`item.${r.code}.cartons`] = "Bottles is required.";
      } else if (!Number.isInteger(bottles) || bottles < 1) {
        next[`item.${r.code}.cartons`] = "Enter whole bottles (1 or more).";
      } else {
        if (!r.bottlesPerBox.trim()) {
          next[`item.${r.code}.bottlesPerBox`] = "Bottles per carton is required.";
        } else if (!Number.isInteger(bpb) || bpb < 1) {
          next[`item.${r.code}.bottlesPerBox`] = "Must be an integer ≥ 1.";
        } else {
          const resolved = bottlesToStandardCartons(bottles, bpb, r.productName.trim());
          if (!resolved.ok) {
            next[`item.${r.code}.cartons`] = resolved.message.replace(/\*\*/g, "");
          }
        }
      }

      const qtyOk = hasName && Number.isInteger(bottles) && bottles >= 1;
      const bpbOk = Number.isInteger(bpb) && bpb >= 1;
      const cartonOk =
        qtyOk && bpbOk && bottlesToStandardCartons(bottles, bpb, r.productName.trim()).ok;
      if (qtyOk && bpbOk && cartonOk) validCount += 1;
    });

    if (validCount === 0 && buildCustomCartonsPayload(customCartons, customBoxCatalog).length === 0) {
      next.items = "Enter bottles for at least one product, or add a custom carton.";
    }

    if (customCartons.length > 0) {
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
      });
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
      const bottles = Number(row.cartons);
      if (!Number.isInteger(bottles) || bottles < 1) continue;
      const perCarton = row.useDefaultPacking ? p.bottlesPerCarton : Number(row.bottlesPerBox);
      const resolved = bottlesToStandardCartons(bottles, perCarton, p.name);
      if (!resolved.ok) continue;
      out.push({
        productName: p.name,
        boxes: resolved.cartons,
        bottlesPerBox: resolved.bottlesPerBox,
      });
    }
    for (const r of otherRows) {
      const bottles = Number(r.cartons);
      const bpb = Number(r.bottlesPerBox);
      const pn = r.productName.trim();
      if (!pn) continue;
      if (!Number.isInteger(bottles) || bottles < 1) continue;
      const resolved = bottlesToStandardCartons(bottles, bpb, pn);
      if (!resolved.ok) continue;
      out.push({ productName: pn, boxes: resolved.cartons, bottlesPerBox: resolved.bottlesPerBox });
    }
    return out;
  }

  function elementForErrorKey(key: string): HTMLElement | null {
    if (key === "poNumber" || key === "customerName") return document.getElementById(key);
    const itemMatch = /^item\.([^.]+)\.([^.]+)$/.exec(key);
    if (itemMatch) return document.getElementById(`grid-${itemMatch[1]}-${itemMatch[2]}`);
    const ccBox = /^customCartons\.(\d+)\.boxCount$/.exec(key);
    if (ccBox) {
      const carton = customCartons[Number(ccBox[1])];
      return carton ? document.getElementById(`cc-${carton.id}-count`) : null;
    }
    const ccRow = /^customCartons\.(\d+)\.rows\.(\d+)\.(productName|bottles|bottleSizeCode)$/.exec(key);
    if (ccRow) {
      const row = customCartons[Number(ccRow[1])]?.rows[Number(ccRow[2])];
      if (!row) return null;
      if (ccRow[3] === "bottles") return document.getElementById(`cc-row-${row.id}-bottles`);
      if (ccRow[3] === "bottleSizeCode") return document.getElementById(`cc-row-${row.id}-size`);
      return document.getElementById(`cc-row-${row.id}-pick`);
    }
    const ccContents = /^customCartons\.(\d+)\.contents$/.exec(key);
    if (ccContents) {
      const carton = customCartons[Number(ccContents[1])];
      const row = carton?.rows[0];
      return row ? document.getElementById(`cc-row-${row.id}-pick`) : null;
    }
    return null;
  }

  function scrollToFirstError(errs: FieldErrors) {
    const keys = Object.keys(errs);
    if (keys.length === 0) return;

    const rank = (k: string) => {
      if (k === "poNumber") return 0;
      if (k === "customerName") return 1;
      if (k.startsWith("customCartons.")) return 2;
      if (k.startsWith("item.")) return 3;
      return 4;
    };
    const sorted = [...keys].sort((a, b) => rank(a) - rank(b));

    for (const key of sorted) {
      const el = elementForErrorKey(key);
      if (!el) continue;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement) {
        el.focus();
      }
      return;
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSuccessId(null);

    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      scrollToFirstError(nextErrors);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          orderKind: "standard",
          items: buildSubmitItems(),
          customCartons: buildCustomCartonsPayload(customCartons, customBoxCatalog),
          poNumber: poNumber.trim(),
          customerName: customerName.trim(),
          city: city.trim(),
          deadlineDate: deadlineDate.trim() || undefined,
          ...(visitTicketId.trim() ? { visitTicketId: visitTicketId.trim() } : {}),
        }),
      });

      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }

      const data = (await res.json().catch(() => null)) as {
        id?: string;
        errors?: Record<string, string>;
        visitTicketClosed?: boolean;
        pointsAwarded?: number;
      } | null;

      if (!res.ok) {
        if (data?.errors && typeof data.errors === "object") {
          setErrors(data.errors as FieldErrors);
        } else {
          setErrors({ poNumber: "Could not save order. Please try again." });
        }
        return;
      }

      setSuccessId(String(data?.id ?? ""));
      setVisitTicketId("");
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
      setCustomCartons([]);
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
        Enter total bottles per product (e.g. 30 bottles Rhino 500ml = 1 carton). If the count is not a
        full carton, use Add custom carton for mixed or odd quantities.
      </p>

      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        {visitTickets.length > 0 ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
            <label className="block text-sm font-medium text-emerald-950" htmlFor="visitTicket">
              Link to field visit (optional)
            </label>
            <p className="mt-0.5 text-xs text-emerald-800">
              Concluded visits only — saving the PO closes the ticket with +10 points.
            </p>
            <select
              id="visitTicket"
              value={visitTicketId}
              onChange={(e) => {
                const id = e.target.value;
                setVisitTicketId(id);
                const t = visitTickets.find((v) => v.id === id);
                if (t) {
                  setCustomerName(t.customerName);
                  setCity(t.city);
                }
              }}
              className="mt-2 w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm"
            >
              <option value="">— No visit link —</option>
              {visitTickets.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.placeName} — {t.customerName}
                  {t.city ? ` (${t.city})` : ""}
                </option>
              ))}
            </select>
            {errors.visitTicketId ? (
              <p className="mt-1 text-sm text-red-700">{errors.visitTicketId}</p>
            ) : null}
          </div>
        ) : null}
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

        {customCartons.length === 0 ? (
          <button
            type="button"
            onClick={() => setCustomCartons([emptyCartonDraft()])}
            className="rounded-lg border border-dashed border-zinc-400 bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-100"
          >
            + Add custom carton
          </button>
        ) : null}

        {customCartons.length > 0 ? (
          <CustomCartonBuilder
            cartons={customCartons}
            onChange={(next) => {
              setCustomCartons(next);
              setErrors((prev) => {
                const cleaned = { ...prev };
                for (const k of Object.keys(cleaned)) {
                  if (k.startsWith("customCartons.")) delete cleaned[k];
                }
                return cleaned;
              });
            }}
            disabled={submitting}
            errors={errors}
            catalogProducts={customBoxCatalog}
          />
        ) : null}

        <NewOrderProductGrid
          catalog={catalog}
          catalogLoading={catalogLoading}
          mode="standard_bottles"
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

        {submitBlockReason ? (
          <p className="text-sm text-amber-800">{submitBlockReason}</p>
        ) : Object.keys(errors).length > 0 ? (
          <ul className="list-disc space-y-1 pl-5 text-sm text-red-700">
            {[...new Set(Object.values(errors))].slice(0, 4).map((msg) => (
              <li key={msg}>{msg}</li>
            ))}
          </ul>
        ) : null}

        <button
          type="submit"
          disabled={!canSubmit || submitting}
          className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Saving…" : "Create order"}
        </button>
      </form>
    </div>
  );
}
