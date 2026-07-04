"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  CHEMICAL_ACCESSORIES,
  type ChemicalRequestAccessory,
  type SerializedChemicalMaterial,
  type SerializedChemicalRequest,
} from "@/lib/chemicalMaterials";
import { ui } from "@/lib/ui";

type Props = {
  readOnly?: boolean;
  /** Ramazan / admin: edit stock on hand. */
  stockEditable?: boolean;
  canRequest?: boolean;
  /** Ramazan / admin: add new catalog materials. */
  canAddMaterial?: boolean;
};

function fmt(n: number) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatAccessorySummary(accessories: ChemicalRequestAccessory[]) {
  const summary = accessories
    .filter((item) => item.quantityRequested > 0)
    .map((item) => `${fmt(item.quantityRequested)} ${item.itemName || item.itemCode}`);
  return summary.length > 0 ? summary.join(", ") : "";
}

export function ChemicalMaterialsPortal({
  readOnly = false,
  stockEditable = false,
  canRequest = false,
  canAddMaterial = false,
}: Props) {
  const [materials, setMaterials] = useState<SerializedChemicalMaterial[]>([]);
  const [requests, setRequests] = useState<SerializedChemicalRequest[]>([]);
  const [search, setSearch] = useState("");
  const [stockDraft, setStockDraft] = useState<Record<string, string>>({});
  const [stockStatus, setStockStatus] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [requestModal, setRequestModal] = useState<SerializedChemicalMaterial | null>(null);
  const [requestQty, setRequestQty] = useState("");
  const [requestAccessories, setRequestAccessories] = useState<Record<string, string>>({});
  const [requestNote, setRequestNote] = useState("");
  const [requestError, setRequestError] = useState("");
  const [requestSaving, setRequestSaving] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addUnit, setAddUnit] = useState("kg");
  const [addOnHand, setAddOnHand] = useState("");
  const [addError, setAddError] = useState("");
  const [addSaving, setAddSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [matRes, reqRes] = await Promise.all([
        fetch("/api/chemical-materials", { credentials: "same-origin" }),
        canRequest
          ? fetch("/api/chemical-material-requests?mine=1", { credentials: "same-origin" })
          : Promise.resolve(null),
      ]);
      if (matRes.ok) {
        const data = (await matRes.json()) as { materials?: SerializedChemicalMaterial[] };
        const list = (data.materials ?? []).filter((material) => material.kind !== "accessory");
        setMaterials(list);
        const draft: Record<string, string> = {};
        for (const m of list) draft[m.code] = String(m.onHand);
        setStockDraft(draft);
      }
      if (reqRes?.ok) {
        const data = (await reqRes.json()) as { requests?: SerializedChemicalRequest[] };
        setRequests(data.requests ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [canRequest]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return materials;
    return materials.filter(
      (m) => m.name.toLowerCase().includes(q) || m.code.toLowerCase().includes(q),
    );
  }, [materials, search]);

  async function saveStock(code: string) {
    if (!stockEditable) return;
    const onHand = Number(stockDraft[code]);
    if (!Number.isFinite(onHand) || onHand < 0) return;

    setStockStatus((s) => ({ ...s, [code]: "saving" }));
    const res = await fetch(`/api/chemical-materials/${encodeURIComponent(code)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ onHand }),
    });
    if (res.ok) {
      const data = (await res.json()) as { material: SerializedChemicalMaterial };
      setMaterials((prev) =>
        prev.map((m) => (m.code === code ? { ...m, onHand: data.material.onHand } : m)),
      );
      setStockStatus((s) => ({ ...s, [code]: "saved" }));
      setTimeout(() => setStockStatus((s) => ({ ...s, [code]: "" })), 1200);
    } else {
      setStockStatus((s) => ({ ...s, [code]: "error" }));
    }
  }

  async function submitAddMaterial(e: React.FormEvent) {
    e.preventDefault();
    if (!canAddMaterial) return;
    setAddSaving(true);
    setAddError("");
    try {
      const res = await fetch("/api/chemical-materials", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: addName.trim(),
          unit: addUnit.trim() || "kg",
          onHand: addOnHand.trim() === "" ? 0 : Number(addOnHand),
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setAddError(data.error ?? "Could not add material.");
        return;
      }
      setAddOpen(false);
      setAddName("");
      setAddUnit("kg");
      setAddOnHand("");
      await load();
    } finally {
      setAddSaving(false);
    }
  }

  async function submitRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!requestModal) return;
    setRequestSaving(true);
    setRequestError("");
    const accessories = CHEMICAL_ACCESSORIES.map((item) => ({
      itemCode: item.code,
      quantityRequested: Number(requestAccessories[item.code]) || 0,
    })).filter((item) => item.quantityRequested > 0);
    try {
      const res = await fetch("/api/chemical-material-requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          materialCode: requestModal.code,
          quantityRequested: Number(requestQty) || 0,
          accessories,
          note: requestNote.trim(),
        }),
      });
      const data = (await res.json()) as { error?: string; request?: SerializedChemicalRequest };
      if (!res.ok) {
        setRequestError(data.error ?? "Could not submit request.");
        return;
      }
      setRequestModal(null);
      setRequestQty("");
      setRequestAccessories({});
      setRequestNote("");
      await load();
    } finally {
      setRequestSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-zinc-600">Loading chemical materials…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search material…"
          className={`${ui.input} max-w-md`}
        />
        <span className="text-sm text-zinc-500">
          {filtered.length} of {materials.length} materials
        </span>
        {canAddMaterial ? (
          <button
            type="button"
            onClick={() => {
              setAddOpen(true);
              setAddName("");
              setAddUnit("kg");
              setAddOnHand("");
              setAddError("");
            }}
            className={ui.btnPrimary}
          >
            Add material
          </button>
        ) : null}
      </div>

      <div className={`${ui.card} overflow-x-auto p-0`}>
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600">
              <th className="border-b border-zinc-200 px-3 py-2">Material</th>
              <th className="border-b border-zinc-200 px-3 py-2 text-right">Stock available</th>
              <th className="border-b border-zinc-200 px-3 py-2 w-16">Unit</th>
              {canRequest || stockEditable ? (
                <th className="border-b border-zinc-200 px-3 py-2 w-36" />
              ) : null}
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => (
              <tr key={m.code} className="border-b border-zinc-100">
                <td className="px-3 py-2 font-medium text-zinc-900">{m.name}</td>
                <td className="px-3 py-2 text-right">
                  {stockEditable ? (
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={stockDraft[m.code] ?? String(m.onHand)}
                      onChange={(e) =>
                        setStockDraft((prev) => ({ ...prev, [m.code]: e.target.value }))
                      }
                      onBlur={() => saveStock(m.code)}
                      className="w-28 rounded border border-zinc-200 px-2 py-1 text-right text-sm tabular-nums"
                    />
                  ) : (
                    <span className="tabular-nums">{fmt(m.onHand)}</span>
                  )}
                  {stockEditable && stockStatus[m.code] === "saved" ? (
                    <span className="ml-1 text-xs text-emerald-700">✓</span>
                  ) : null}
                </td>
                <td className="px-3 py-2 text-zinc-600">{m.unit}</td>
                {canRequest || stockEditable ? (
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {canRequest ? (
                        <button
                          type="button"
                          onClick={() => {
                            setRequestModal(m);
                            setRequestQty("");
                            setRequestAccessories({});
                            setRequestNote("");
                            setRequestError("");
                          }}
                          className={ui.btnSecondarySm}
                        >
                          Request
                        </button>
                      ) : null}
                      {stockEditable ? (
                        <button
                          type="button"
                          onClick={() => saveStock(m.code)}
                          className={ui.btnSecondarySm}
                        >
                          Save
                        </button>
                      ) : null}
                    </div>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {canRequest && requests.length > 0 ? (
        <div className={`${ui.card} space-y-3 p-4`}>
          <h2 className="text-sm font-semibold text-zinc-900">Your recent requests</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-zinc-500">
                  <th className="pb-2 pr-2">Material</th>
                  <th className="pb-2 pr-2 text-right">Qty</th>
                  <th className="pb-2 pr-2">Status</th>
                  <th className="pb-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {requests.slice(0, 20).map((r) => (
                  <tr key={r.id} className="border-t border-zinc-100">
                    <td className="py-2 pr-2">
                      <div>{r.materialName}</div>
                      {formatAccessorySummary(r.accessories) ? (
                        <div className="text-xs text-zinc-500">
                          Accessories: {formatAccessorySummary(r.accessories)}
                        </div>
                      ) : null}
                    </td>
                    <td className="py-2 pr-2 text-right tabular-nums">
                      {fmt(r.quantityRequested)} {r.unit}
                    </td>
                    <td className="py-2 pr-2 capitalize">{r.status}</td>
                    <td className="py-2 text-zinc-600">
                      {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {addOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={submitAddMaterial}
            className={`${ui.card} w-full max-w-md space-y-4 p-4`}
          >
            <h3 className="text-base font-semibold text-zinc-900">Add material</h3>
            <div>
              <label className={ui.label} htmlFor="add-name">
                Material name
              </label>
              <input
                id="add-name"
                required
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                className={`${ui.input} mt-1`}
                placeholder="e.g. Caustic soda"
              />
            </div>
            <div>
              <label className={ui.label} htmlFor="add-unit">
                Unit
              </label>
              <input
                id="add-unit"
                value={addUnit}
                onChange={(e) => setAddUnit(e.target.value)}
                className={`${ui.input} mt-1`}
                placeholder="kg"
              />
            </div>
            <div>
              <label className={ui.label} htmlFor="add-onhand">
                Starting stock (optional)
              </label>
              <input
                id="add-onhand"
                type="number"
                min={0}
                step="any"
                value={addOnHand}
                onChange={(e) => setAddOnHand(e.target.value)}
                className={`${ui.input} mt-1`}
                placeholder="0"
              />
            </div>
            {addError ? <p className="text-sm text-red-700">{addError}</p> : null}
            <div className="flex gap-2">
              <button type="submit" disabled={addSaving} className={ui.btnPrimary}>
                {addSaving ? "Adding…" : "Add to catalog"}
              </button>
              <button type="button" onClick={() => setAddOpen(false)} className={ui.btnGhost}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {requestModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={submitRequest}
            className={`${ui.card} w-full max-w-md space-y-4 p-4`}
          >
            <h3 className="text-base font-semibold text-zinc-900">Request material</h3>
            <p className="text-sm text-zinc-700">
              <strong>{requestModal.name}</strong> — stock now: {fmt(requestModal.onHand)}{" "}
              {requestModal.unit}
            </p>
            <div>
              <label className={ui.label} htmlFor="req-qty">
                Quantity needed
              </label>
              <input
                id="req-qty"
                type="number"
                min={0.001}
                step="any"
                required
                value={requestQty}
                onChange={(e) => setRequestQty(e.target.value)}
                className={`${ui.input} mt-1`}
              />
            </div>
            <div>
              <label className={ui.label} htmlFor="req-note">
                Note (optional)
              </label>
              <input
                id="req-note"
                value={requestNote}
                onChange={(e) => setRequestNote(e.target.value)}
                className={`${ui.input} mt-1`}
                placeholder="Urgency or supplier hint"
              />
            </div>
            <fieldset className="space-y-3 rounded-lg border border-zinc-200 p-3">
              <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-zinc-600">
                Optional packing/accessories
              </legend>
              <p className="text-xs text-zinc-500">
                Only fill these if needed for this chemical request.
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                {CHEMICAL_ACCESSORIES.map((item) => (
                  <div key={item.code}>
                    <label className={ui.label} htmlFor={`req-accessory-${item.code}`}>
                      {item.name}
                    </label>
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        id={`req-accessory-${item.code}`}
                        type="number"
                        min={0}
                        step="1"
                        value={requestAccessories[item.code] ?? ""}
                        onChange={(e) =>
                          setRequestAccessories((prev) => ({
                            ...prev,
                            [item.code]: e.target.value,
                          }))
                        }
                        className={ui.input}
                        placeholder="0"
                      />
                      <span className="text-xs text-zinc-500">{item.unit}</span>
                    </div>
                  </div>
                ))}
              </div>
            </fieldset>
            {requestError ? <p className="text-sm text-red-700">{requestError}</p> : null}
            <div className="flex gap-2">
              <button type="submit" disabled={requestSaving} className={ui.btnPrimary}>
                {requestSaving ? "Sending…" : "Send to Waleed"}
              </button>
              <button
                type="button"
                onClick={() => setRequestModal(null)}
                className={ui.btnGhost}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
