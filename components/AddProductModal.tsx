"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AddProductModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [batchFamily, setBatchFamily] = useState("");
  const [bottlesPerCarton, setBottlesPerCarton] = useState("12");
  const [litersPerBottle, setLitersPerBottle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function resetForm() {
    setCode("");
    setName("");
    setBatchFamily("");
    setBottlesPerCarton("12");
    setLitersPerBottle("");
    setError(null);
    setSuccess(null);
  }

  function close() {
    setOpen(false);
    resetForm();
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        code: code.trim(),
        name: name.trim(),
        bottlesPerCarton: Number(bottlesPerCarton),
      };
      const bf = batchFamily.trim();
      if (bf) payload.batchFamily = bf;
      const lp = litersPerBottle.trim();
      if (lp) payload.litersPerBottle = Number(lp);

      const res = await fetch("/api/product-packings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error || `Save failed (${res.status})`);
        return;
      }
      setSuccess("Product added.");
      router.refresh();
      setTimeout(() => {
        close();
      }, 600);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          resetForm();
          setOpen(true);
        }}
        className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 shadow-sm hover:bg-zinc-50"
      >
        Add product
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
          <button
            type="button"
            className="absolute inset-0 bg-zinc-900/40"
            aria-label="Close dialog"
            onClick={() => !submitting && close()}
          />
          <div
            role="dialog"
            aria-modal="true"
            className="relative z-10 w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-lg"
          >
            <h2 className="text-lg font-semibold text-zinc-900">Add catalog product</h2>
            <p className="mt-1 text-sm text-zinc-600">
              New packings appear for PO team after they refresh or open a new order. Liters per bottle can be left
              blank to infer from the name (e.g. 500ml → 0.5 L).
            </p>

            <form onSubmit={onSubmit} className="mt-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-zinc-800" htmlFor="add-product-code">
                  Code (slug)
                </label>
                <input
                  id="add-product-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  autoComplete="off"
                  placeholder="e.g. my-product-500ml"
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-800" htmlFor="add-product-name">
                  Display name
                </label>
                <input
                  id="add-product-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="off"
                  placeholder="e.g. My Product 500ml"
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-800" htmlFor="add-product-family">
                  Batch family (optional)
                </label>
                <input
                  id="add-product-family"
                  value={batchFamily}
                  onChange={(e) => setBatchFamily(e.target.value)}
                  autoComplete="off"
                  placeholder="Defaults to display name if empty"
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-800" htmlFor="add-product-bpc">
                  Bottles per carton
                </label>
                <input
                  id="add-product-bpc"
                  type="number"
                  min={1}
                  step={1}
                  value={bottlesPerCarton}
                  onChange={(e) => setBottlesPerCarton(e.target.value)}
                  required
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-800" htmlFor="add-product-lpb">
                  Liters per bottle (optional)
                </label>
                <input
                  id="add-product-lpb"
                  type="number"
                  min={0.001}
                  step="any"
                  value={litersPerBottle}
                  onChange={(e) => setLitersPerBottle(e.target.value)}
                  placeholder="Infer from name if empty"
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                />
              </div>

              {error ? <p className="text-sm text-red-600">{error}</p> : null}
              {success ? <p className="text-sm text-green-700">{success}</p> : null}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => close()}
                  disabled={submitting}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {submitting ? "Saving…" : "Save product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
