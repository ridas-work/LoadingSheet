"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { CATEGORY_LABELS, PACKAGING_CATEGORIES } from "@/lib/packagingInventory";
import { ui } from "@/lib/ui";

export function AddPackagingItemModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>("other");
  const [linkedProductCode, setLinkedProductCode] = useState("");
  const [linkedBatchFamily, setLinkedBatchFamily] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setCode("");
    setName("");
    setCategory("other");
    setLinkedProductCode("");
    setLinkedBatchFamily("");
    setError(null);
  }

  function close() {
    setOpen(false);
    resetForm();
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const payload: Record<string, string> = {
        name: name.trim(),
        category,
      };
      if (code.trim()) payload.code = code.trim();
      if (linkedProductCode.trim()) payload.linkedProductCode = linkedProductCode.trim();
      if (linkedBatchFamily.trim()) payload.linkedBatchFamily = linkedBatchFamily.trim();

      const res = await fetch("/api/packaging-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? `Save failed (${res.status})`);
        return;
      }
      router.refresh();
      close();
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
        Add material
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
          <button
            type="button"
            className="absolute inset-0 bg-brand-950/50 backdrop-blur-[2px]"
            aria-label="Close dialog"
            onClick={() => !submitting && close()}
          />
          <div
            role="dialog"
            aria-modal="true"
            className={`${ui.card} relative z-10 w-full max-w-md p-6 shadow-lg`}
          >
            <h2 className="text-lg font-bold text-slate-900">Add packaging material</h2>
            <p className={`${ui.pageDesc} mt-1`}>
              Manually register bottles, caps, boxes, or other packaging items. Code is optional
              — leave blank to auto-generate from the name.
            </p>

            <form onSubmit={onSubmit} className="mt-4 space-y-3">
              <div>
                <label className={ui.label} htmlFor="packaging-name">
                  Material name
                </label>
                <input
                  id="packaging-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="off"
                  placeholder="e.g. LT-101 DRUM LIDS"
                  className={`${ui.input} mt-1.5`}
                />
              </div>
              <div>
                <label className={ui.label} htmlFor="packaging-code">
                  Code (optional)
                </label>
                <input
                  id="packaging-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  autoComplete="off"
                  placeholder="e.g. lt-101-drum-lids"
                  className={`${ui.input} mt-1.5`}
                />
              </div>
              <div>
                <label className={ui.label} htmlFor="packaging-category">
                  Type
                </label>
                <select
                  id="packaging-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className={`${ui.input} mt-1.5`}
                >
                  {PACKAGING_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {CATEGORY_LABELS[cat] ?? cat}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={ui.label} htmlFor="packaging-linked-product">
                  Linked product code (optional)
                </label>
                <input
                  id="packaging-linked-product"
                  value={linkedProductCode}
                  onChange={(e) => setLinkedProductCode(e.target.value)}
                  autoComplete="off"
                  placeholder="e.g. brighten-liquid-laundry-detergent"
                  className={`${ui.input} mt-1.5`}
                />
              </div>
              <div>
                <label className={ui.label} htmlFor="packaging-linked-family">
                  Linked batch family (optional)
                </label>
                <input
                  id="packaging-linked-family"
                  value={linkedBatchFamily}
                  onChange={(e) => setLinkedBatchFamily(e.target.value)}
                  autoComplete="off"
                  placeholder="e.g. Brighten"
                  className={`${ui.input} mt-1.5`}
                />
              </div>

              {error ? <div className={ui.alertDanger}>{error}</div> : null}

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
                  {submitting ? "Saving…" : "Add material"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
