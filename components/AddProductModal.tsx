"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ui } from "@/lib/ui";

export function AddProductModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [batchFamily, setBatchFamily] = useState("");
  const [bottlesPerCarton, setBottlesPerCarton] = useState("");
  const [litersPerBottle, setLitersPerBottle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function resetForm() {
    setCode("");
    setName("");
    setBatchFamily("");
    setBottlesPerCarton("");
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
      };
      const bf = batchFamily.trim();
      if (bf) payload.batchFamily = bf;
      const bpc = bottlesPerCarton.trim();
      if (bpc) payload.bottlesPerCarton = Number(bpc);
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
        className={ui.btnSecondary}
      >
        Add product
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
          <button
            type="button"
            className="absolute inset-0 bg-brand-950/50 backdrop-blur-[2px]"
            aria-label="Close dialog"
            onClick={() => !submitting && close()}
          />
          <div role="dialog" aria-modal="true" className={`${ui.card} relative z-10 w-full max-w-md p-6 shadow-lg`}>
            <h2 className="text-lg font-bold text-slate-900">Add catalog product</h2>
            <p className={`${ui.pageDesc} mt-1`}>
              New packings appear for PO team after they refresh or open a new order. Bottles per carton and liters per
              bottle are optional — leave blank to use defaults (1 bottle/carton; size inferred from the name, e.g.
              500ml → 0.5 L).
            </p>

            <form onSubmit={onSubmit} className="mt-4 space-y-3">
              <div>
                <label className={ui.label} htmlFor="add-product-code">
                  Code (slug)
                </label>
                <input
                  id="add-product-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  autoComplete="off"
                  placeholder="e.g. my-product-500ml"
                  className={`${ui.input} mt-1.5`}
                />
              </div>
              <div>
                <label className={ui.label} htmlFor="add-product-name">
                  Display name
                </label>
                <input
                  id="add-product-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="off"
                  placeholder="e.g. My Product 500ml"
                  className={`${ui.input} mt-1.5`}
                />
              </div>
              <div>
                <label className={ui.label} htmlFor="add-product-family">
                  Batch family (optional)
                </label>
                <input
                  id="add-product-family"
                  value={batchFamily}
                  onChange={(e) => setBatchFamily(e.target.value)}
                  autoComplete="off"
                  placeholder="Defaults to display name if empty"
                  className={`${ui.input} mt-1.5`}
                />
              </div>
              <div>
                <label className={ui.label} htmlFor="add-product-bpc">
                  Bottles per carton (optional)
                </label>
                <input
                  id="add-product-bpc"
                  type="number"
                  min={1}
                  step={1}
                  value={bottlesPerCarton}
                  onChange={(e) => setBottlesPerCarton(e.target.value)}
                  placeholder="Defaults to 1 if empty"
                  className={`${ui.input} mt-1.5`}
                />
              </div>
              <div>
                <label className={ui.label} htmlFor="add-product-lpb">
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
                  className={`${ui.input} mt-1.5`}
                />
              </div>

              {error ? <div className={ui.alertDanger}>{error}</div> : null}
              {success ? <div className={ui.alertSuccess}>{success}</div> : null}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => close()}
                  disabled={submitting}
                  className={`${ui.btnGhost} text-slate-700`}
                >
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className={ui.btnPrimary}>
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
