"use client";

import { useMemo, useRef, useState } from "react";

type FieldErrors = Partial<Record<"poNumber" | "customerName" | "productName" | "bottles", string>>;

export default function NewOrderPage() {
  const [poNumber, setPoNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [productName, setProductName] = useState("");
  const [bottles, setBottles] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [successId, setSuccessId] = useState<string | null>(null);
  const customerRef = useRef<HTMLInputElement | null>(null);
  const productRef = useRef<HTMLInputElement | null>(null);
  const bottlesRef = useRef<HTMLInputElement | null>(null);

  const canSubmit = useMemo(
    () => poNumber.trim() && customerName.trim() && productName.trim() && bottles.trim(),
    [bottles, customerName, poNumber, productName],
  );

  function validate(): FieldErrors {
    const next: FieldErrors = {};
    if (!poNumber.trim()) next.poNumber = "PO number is required.";
    if (!customerName.trim()) next.customerName = "Customer name is required.";
    if (!productName.trim()) next.productName = "Product name is required.";
    const n = Number(bottles);
    if (!bottles.trim()) next.bottles = "Number of bottles is required.";
    else if (!Number.isInteger(n) || n < 1) next.bottles = "Bottles must be an integer ≥ 1.";
    return next;
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
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          poNumber: poNumber.trim(),
          customerName: customerName.trim(),
          productName: productName.trim(),
          bottles: Number(bottles),
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
      setProductName("");
      setBottles("");
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
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSuccessId(null)}
            className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white"
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
      <p className="mt-1 text-sm text-zinc-600">Enter PO details and submit.</p>

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
              if (e.key === "Enter") productRef.current?.focus();
            }}
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
          />
          {errors.customerName ? (
            <div className="mt-1 text-sm text-red-700">{errors.customerName}</div>
          ) : null}
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-800" htmlFor="productName">
            Product name
          </label>
          <input
            id="productName"
            ref={productRef}
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") bottlesRef.current?.focus();
            }}
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
          />
          {errors.productName ? (
            <div className="mt-1 text-sm text-red-700">{errors.productName}</div>
          ) : null}
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-800" htmlFor="bottles">
            Bottles
          </label>
          <input
            id="bottles"
            ref={bottlesRef}
            inputMode="numeric"
            value={bottles}
            onChange={(e) => setBottles(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
          />
          {errors.bottles ? <div className="mt-1 text-sm text-red-700">{errors.bottles}</div> : null}
        </div>

        <button
          type="submit"
          disabled={!canSubmit || submitting}
          className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {submitting ? "Saving…" : "Create order"}
        </button>
      </form>
    </div>
  );
}

