"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { parseTotalLitersFromQuantity } from "@/lib/parseBatchQuantityLiters";
import type { NimraBatchKind } from "@/lib/nimraBatchProductLists";
import type { QcOutcomeInput } from "@/lib/productionBatchQc";
import type { ProductionPurpose } from "@/lib/productionBatchApi";
import {
  isRhinoBatchFamily,
  isViscosityApplicableBatchFamily,
} from "@/lib/viscosityBatchFamily";

type Props = {
  batchId?: string;
  initialBatchKind?: NimraBatchKind;
  initialBatchNo?: string;
  initialProductName?: string;
  initialPreparedAt?: string;
  initialPh?: string;
  initialSolids?: string;
  initialAppearance?: string;
  initialProvider?: string;
  initialHcl?: string;
  initialViscosity?: string;
  initialQuantity?: string;
  initialDrum?: string;
  initialCustomer?: string;
  initialQcOutcome?: QcOutcomeInput;
  initialQcComment?: string;
  initialTotalLiters?: number;
  initialProductionPurpose?: ProductionPurpose;
  /** Batch assigned on POs — only batch number can be corrected. */
  lockedInUse?: boolean;
};

function Field({
  id,
  label,
  value,
  onChange,
  disabled,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-zinc-800" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm disabled:bg-zinc-100"
      />
    </div>
  );
}

export function ProductionBatchForm({
  batchId,
  initialBatchKind = "standard",
  initialBatchNo = "",
  initialProductName = "",
  initialPreparedAt,
  initialPh = "",
  initialSolids = "",
  initialAppearance = "",
  initialProvider = "",
  initialHcl = "",
  initialViscosity = "",
  initialQuantity = "",
  initialDrum = "",
  initialCustomer = "",
  initialQcOutcome,
  initialQcComment = "",
  initialTotalLiters,
  initialProductionPurpose = "regular",
  lockedInUse = false,
}: Props) {
  const router = useRouter();
  const isEdit = Boolean(batchId);
  const [batchKind, setBatchKind] = useState<NimraBatchKind>(initialBatchKind);
  const [productionPurpose, setProductionPurpose] = useState<ProductionPurpose>(initialProductionPurpose);
  const [standardFamilies, setStandardFamilies] = useState<string[]>([]);
  const [customBoxProducts, setCustomBoxProducts] = useState<string[]>([]);
  const [batchNo, setBatchNo] = useState(initialBatchNo);
  const [productName, setProductName] = useState(initialProductName);
  const [preparedAt, setPreparedAt] = useState(
    initialPreparedAt ?? new Date().toISOString().slice(0, 10),
  );
  const [ph, setPh] = useState(initialPh);
  const [solids, setSolids] = useState(initialSolids);
  const [appearance, setAppearance] = useState(initialAppearance);
  const [provider, setProvider] = useState(initialProvider);
  const [hcl, setHcl] = useState(initialHcl);
  const [viscosity, setViscosity] = useState(initialViscosity);
  const [quantity, setQuantity] = useState(initialQuantity);
  const [drum, setDrum] = useState(initialDrum);
  const [customer, setCustomer] = useState(initialCustomer);
  const [qcOutcome, setQcOutcome] = useState<QcOutcomeInput | null>(initialQcOutcome ?? null);
  const [qcComment, setQcComment] = useState(initialQcComment);
  const [discardComment, setDiscardComment] = useState("");
  const [showDiscardForm, setShowDiscardForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [discarding, setDiscarding] = useState(false);

  const isCustomBox = batchKind === "custom_box";
  const showHcl = !isCustomBox && isRhinoBatchFamily(productName);
  const showViscosity = !isCustomBox && isViscosityApplicableBatchFamily(productName);

  useEffect(() => {
    if (!showHcl) setHcl("");
  }, [showHcl]);

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then(
        (data: {
          batchFamilies?: Array<{ batchFamily: string }>;
          customBoxProducts?: string[];
        }) => {
          const families = Array.isArray(data.batchFamilies)
            ? data.batchFamilies.map((f) => f.batchFamily).filter(Boolean)
            : [];
          setStandardFamilies(families);
          setCustomBoxProducts(
            Array.isArray(data.customBoxProducts) ? data.customBoxProducts : [],
          );
        },
      )
      .catch(() => {
        setStandardFamilies([]);
        setCustomBoxProducts([]);
      });
  }, []);

  function switchKind(next: NimraBatchKind) {
    if (next === batchKind) return;
    setBatchKind(next);
    setProductName("");
    setHcl("");
    setViscosity("");
    setDrum("");
    setCustomer("");
    setError(null);
  }

  const productOptions = isCustomBox ? customBoxProducts : standardFamilies;
  const parsedLiters = useMemo(() => parseTotalLitersFromQuantity(quantity), [quantity]);
  const wasteLiters = parsedLiters ?? initialTotalLiters ?? 0;

  const canSubmit = useMemo(() => {
    if (lockedInUse) {
      return batchNo.trim().length > 0 && batchNo.trim() !== initialBatchNo.trim();
    }
    const base =
      batchNo.trim().length > 0 &&
      productName.length > 0 &&
      parsedLiters != null &&
      parsedLiters > 0 &&
      ph.trim().length > 0 &&
      solids.trim().length > 0 &&
      appearance.trim().length > 0 &&
      provider.trim().length > 0 &&
      quantity.trim().length > 0 &&
      qcOutcome != null;
    if (!base) return false;
    if (qcOutcome === "rejected" && !qcComment.trim()) return false;
    if (isCustomBox) return drum.trim().length > 0;
    return !showHcl || hcl.trim().length > 0;
  }, [
    appearance,
    batchNo,
    drum,
    hcl,
    isCustomBox,
    parsedLiters,
    ph,
    productName,
    provider,
    qcComment,
    qcOutcome,
    quantity,
    showHcl,
    solids,
    lockedInUse,
    initialBatchNo,
  ]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (lockedInUse) {
      if (batchNo.trim() === initialBatchNo.trim()) {
        setError("Enter the corrected batch number.");
        return;
      }
      setSubmitting(true);
      setError(null);
      const res = await fetch(`/api/production-batches/${batchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchNo: batchNo.trim() }),
      });
      setSubmitting(false);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? "Save failed");
        return;
      }
      router.push("/production/batches");
      router.refresh();
      return;
    }

    if (qcOutcome == null) {
      setError("Select Successful or Unsuccessful before saving.");
      return;
    }
    if (qcOutcome === "rejected" && !qcComment.trim()) {
      setError("Enter a comment when the batch is unsuccessful.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const liters = parseTotalLitersFromQuantity(quantity.trim());
    if (liters == null || liters <= 0) {
      setError("Enter quantity in liters (e.g. 350 or 450L).");
      setSubmitting(false);
      return;
    }

    const payload = {
      batchKind,
      batchNo: batchNo.trim(),
      productName,
      totalLiters: liters,
      preparedAt,
      ph: ph.trim(),
      solids: solids.trim(),
      appearance: appearance.trim(),
      provider: provider.trim(),
      hcl: showHcl ? hcl.trim() : "",
      viscosity: showViscosity ? viscosity.trim() : "",
      quantity: quantity.trim(),
      drum: isCustomBox ? drum.trim() : "",
      customer: isCustomBox ? customer.trim() : "",
      qcOutcome,
      qcComment: qcOutcome === "rejected" ? qcComment.trim() : "",
      productionPurpose,
    };

    const res = await fetch(
      isEdit ? `/api/production-batches/${batchId}` : "/api/production-batches",
      {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError((data as { error?: string }).error ?? "Save failed");
      return;
    }

    router.push("/production/batches");
    router.refresh();
  }

  async function onDiscard() {
    if (!batchId || !discardComment.trim()) {
      setError("Enter why this batch is being discarded.");
      return;
    }
    if (
      !confirm(
        `Discard batch "${batchNo}" and record ${wasteLiters} L as waste? This cannot be undone.`,
      )
    ) {
      return;
    }

    setDiscarding(true);
    setError(null);
    try {
      const res = await fetch(`/api/production-batches/${batchId}/qc-status`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "discard", comment: discardComment.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Discard failed");
      router.push("/production/batches");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Discard failed");
    } finally {
      setDiscarding(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      {!isEdit ? (
        <div className="space-y-2">
          <p className="text-sm font-medium text-zinc-800">Batch type</p>
          <div className="grid grid-cols-2 gap-2 rounded-lg bg-zinc-100 p-1">
            <button
              type="button"
              onClick={() => switchKind("standard")}
              className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                !isCustomBox ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              Standard products
            </button>
            <button
              type="button"
              onClick={() => switchKind("custom_box")}
              className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                isCustomBox ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              Custom box / drums
            </button>
          </div>
          <p className="text-xs text-zinc-500">
            {isCustomBox
              ? "Hand Sanitizer, Sequester, and other custom-box-only products — drum packing sheet."
              : "Rhino, Brighten, Degrease, Power Wash, and other main dispatch families."}
          </p>
        </div>
      ) : (
        <p className="rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
          {isCustomBox ? "Custom box / drum batch" : "Standard dispatch batch"}
        </p>
      )}

      <div className="space-y-2">
        <p className="text-sm font-medium text-zinc-800">Production purpose</p>
        <div className="grid grid-cols-2 gap-2 rounded-lg bg-zinc-100 p-1">
          <button
            type="button"
            disabled={lockedInUse}
            onClick={() => setProductionPurpose("regular")}
            className={`rounded-md px-3 py-2 text-sm font-medium transition disabled:opacity-50 ${
              productionPurpose === "regular"
                ? "bg-white text-zinc-900 shadow-sm"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            Regular production
          </button>
          <button
            type="button"
            disabled={lockedInUse}
            onClick={() => setProductionPurpose("sample")}
            className={`rounded-md px-3 py-2 text-sm font-medium transition disabled:opacity-50 ${
              productionPurpose === "sample"
                ? "bg-white text-violet-900 shadow-sm"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            Sample production
          </button>
        </div>
        <p className="text-xs text-zinc-500">
          {productionPurpose === "sample"
            ? "Sample production is for field visit samples only — not used on customer PO loading sheets."
            : "Regular production is assigned to customer PO loading sheets by dispatch."}
        </p>
      </div>

      <Field
        id="batchNo"
        label="Batch number"
        value={batchNo}
        onChange={setBatchNo}
        disabled={isEdit && !lockedInUse}
        placeholder="e.g. 250728-1"
      />

      {lockedInUse ? (
        <p className="text-xs text-amber-800">
          Saving updates this batch number on all loading sheets where it was used.
        </p>
      ) : null}

      {!lockedInUse ? (
        <>
      <div>
        <label className="block text-sm font-medium text-zinc-800" htmlFor="productName">
          Product
        </label>
        <select
          id="productName"
          value={productName}
          onChange={(e) => setProductName(e.target.value)}
          className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
        >
          <option value="">Select product…</option>
          {productOptions.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-800" htmlFor="preparedAt">
          Date
        </label>
        <input
          id="preparedAt"
          type="date"
          value={preparedAt}
          onChange={(e) => setPreparedAt(e.target.value)}
          className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
        />
      </div>

      <Field id="ph" label="pH" value={ph} onChange={setPh} placeholder={isCustomBox ? "e.g. 7.5-8" : "e.g. 7 or 6.5-7"} />
      <Field
        id="solids"
        label="Solids"
        value={solids}
        onChange={setSolids}
        placeholder={isCustomBox ? "e.g. 19%" : "e.g. 29-30% (sinking 17)"}
      />
      <Field
        id="appearance"
        label="Appearance"
        value={appearance}
        onChange={setAppearance}
        placeholder="e.g. Clear liquid"
      />
      <Field id="provider" label="Provider" value={provider} onChange={setProvider} placeholder="e.g. Ramzan" />

      {isCustomBox ? (
        <>
          <Field id="drum" label="Drum" value={drum} onChange={setDrum} placeholder="e.g. 3*150" />
          <Field
            id="quantity"
            label="Quantity"
            value={quantity}
            onChange={setQuantity}
            placeholder="e.g. 450 L or 1000L"
          />
          <Field
            id="customer"
            label="Customer (optional)"
            value={customer}
            onChange={setCustomer}
            placeholder="Customer name if known"
          />
        </>
      ) : (
        <>
          {showHcl ? (
            <Field id="hcl" label="HCL" value={hcl} onChange={setHcl} placeholder="e.g. 12%" />
          ) : null}
          {showViscosity ? (
            <div>
              <Field
                id="viscosity"
                label="Viscosity (optional)"
                value={viscosity}
                onChange={setViscosity}
                placeholder="e.g. 2500 cps"
              />
              <p className="mt-1 text-xs text-zinc-500">
                For Rhino, Brighten, Power Wash batches. Leave blank if not measured.
              </p>
            </div>
          ) : null}
          <Field
            id="quantity"
            label="Quantity (liters)"
            value={quantity}
            onChange={setQuantity}
            placeholder="e.g. 350 or 450L"
          />
        </>
      )}

      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
        <p className="text-sm font-semibold text-zinc-900">QC result</p>
        <p className="mt-1 text-xs text-zinc-600">
          Was this batch prepared successfully? Unsuccessful batches stay in the list but are not
          available for dispatch until corrected and marked successful.
        </p>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setQcOutcome("approved")}
            className={`rounded-lg px-3 py-2.5 text-sm font-medium transition ${
              qcOutcome === "approved"
                ? "bg-emerald-700 text-white shadow-sm"
                : "bg-white text-zinc-700 ring-1 ring-zinc-200 hover:bg-emerald-50"
            }`}
          >
            Successful
          </button>
          <button
            type="button"
            onClick={() => setQcOutcome("rejected")}
            className={`rounded-lg px-3 py-2.5 text-sm font-medium transition ${
              qcOutcome === "rejected"
                ? "bg-red-700 text-white shadow-sm"
                : "bg-white text-zinc-700 ring-1 ring-zinc-200 hover:bg-red-50"
            }`}
          >
            Unsuccessful
          </button>
        </div>

        <div className="mt-3">
          <label className="block text-sm font-medium text-zinc-800" htmlFor="qcComment">
            Comment{qcOutcome === "rejected" ? " (required)" : " (optional)"}
          </label>
          <textarea
            id="qcComment"
            value={qcComment}
            onChange={(e) => setQcComment(e.target.value)}
            rows={3}
            placeholder={
              qcOutcome === "rejected"
                ? "e.g. pH too low, solids out of spec, appearance not clear…"
                : "Any notes about this batch preparation…"
            }
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <p className="text-xs text-zinc-500">
        Stored as entered. Also used for dispatch remaining-volume checks
        {parsedLiters != null ? ` (${parsedLiters} L)` : ""}.
      </p>
        </>
      ) : null}

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <button
        type="submit"
        disabled={!canSubmit || submitting || discarding}
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {submitting
          ? "Saving…"
          : lockedInUse
            ? "Save corrected batch number"
            : isEdit
              ? "Update batch"
              : "Save batch"}
      </button>

      {isEdit && !lockedInUse && qcOutcome === "rejected" ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-950">Discard batch</p>
          <p className="mt-1 text-xs text-red-900">
            If this batch cannot be fixed after repeated attempts, discard it and record{" "}
            <strong>{wasteLiters} L</strong> as waste. It will be removed from dispatch permanently.
          </p>
          {!showDiscardForm ? (
            <button
              type="button"
              onClick={() => setShowDiscardForm(true)}
              disabled={discarding || submitting}
              className="mt-3 rounded-lg bg-red-800 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Discard &amp; waste batch
            </button>
          ) : (
            <div className="mt-3 space-y-2">
              <textarea
                value={discardComment}
                onChange={(e) => setDiscardComment(e.target.value)}
                rows={2}
                placeholder="Why is this batch being discarded?"
                className="w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-sm"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void onDiscard()}
                  disabled={discarding || !discardComment.trim()}
                  className="rounded-lg bg-red-800 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {discarding ? "Discarding…" : "Confirm discard"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDiscardForm(false);
                    setDiscardComment("");
                  }}
                  disabled={discarding}
                  className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-zinc-700 ring-1 ring-zinc-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </form>
  );
}
