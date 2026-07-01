"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { SerializedChemicalIntake, SerializedChemicalMaterial } from "@/lib/chemicalMaterials";
import type { QcOutcomeInput } from "@/lib/productionBatchQc";
import { ui } from "@/lib/ui";

function fmt(n: number) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function ChemicalIntakeForm({ onSaved }: { onSaved?: () => void }) {
  const [materials, setMaterials] = useState<SerializedChemicalMaterial[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCode, setSelectedCode] = useState("");
  const [newName, setNewName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("kg");
  const [qcOutcome, setQcOutcome] = useState<QcOutcomeInput | null>(null);
  const [qcComment, setQcComment] = useState("");
  const [appearance, setAppearance] = useState("");
  const [ph, setPh] = useState("");
  const [solids, setSolids] = useState("");
  const [provider, setProvider] = useState("");
  const [receivedAt, setReceivedAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadMaterials = useCallback(async () => {
    const res = await fetch("/api/chemical-materials", { credentials: "same-origin" });
    if (res.ok) {
      const data = (await res.json()) as { materials?: SerializedChemicalMaterial[] };
      setMaterials(data.materials ?? []);
    }
  }, []);

  useEffect(() => {
    void loadMaterials();
  }, [loadMaterials]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return materials.slice(0, 30);
    return materials
      .filter((m) => m.name.toLowerCase().includes(q) || m.code.toLowerCase().includes(q))
      .slice(0, 30);
  }, [materials, search]);

  const selected = materials.find((m) => m.code === selectedCode);

  function pickMaterial(m: SerializedChemicalMaterial) {
    setSelectedCode(m.code);
    setNewName("");
    setSearch(m.name);
    setUnit(m.unit);
  }

  function useNewName() {
    setSelectedCode("");
    setSearch("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    const name = newName.trim() || selected?.name || search.trim();
    if (!name && !selectedCode) {
      setError("Select an existing material or enter a new chemical name.");
      return;
    }
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      setError("Enter a valid quantity greater than 0.");
      return;
    }
    if (qcOutcome == null) {
      setError("Select Successful or Unsuccessful for QC.");
      return;
    }
    if (qcOutcome === "rejected" && !qcComment.trim()) {
      setError("Comment is required when marking unsuccessful.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/chemical-intakes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          materialCode: selectedCode || undefined,
          materialName: name,
          quantity: qty,
          unit,
          qcOutcome,
          qcComment: qcComment.trim(),
          appearance: appearance.trim(),
          ph: ph.trim(),
          solids: solids.trim(),
          provider: provider.trim(),
          receivedAt,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        material?: { name: string; onHand: number; unit: string };
        createdMaterial?: boolean;
      };
      if (!res.ok) {
        setError(data.error ?? "Could not save intake.");
        return;
      }

      const added = qcOutcome === "approved";
      const created = data.createdMaterial ? " (new catalog entry)" : "";
      setSuccess(
        added
          ? `Recorded — ${data.material?.name ?? name} stock is now ${fmt(data.material?.onHand ?? 0)} ${data.material?.unit ?? unit}${created}.`
          : `Recorded unsuccessful intake for ${name}${created}. Stock unchanged.`,
      );

      setQuantity("");
      setQcOutcome(null);
      setQcComment("");
      setAppearance("");
      setPh("");
      setSolids("");
      setProvider("");
      setSelectedCode("");
      setNewName("");
      setSearch("");
      await loadMaterials();
      onSaved?.();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className={`${ui.card} space-y-4 p-4`}>
      <h2 className="text-sm font-semibold text-zinc-900">Record chemical delivery</h2>

      <div>
        <label className={ui.label} htmlFor="chem-search">
          Material (search existing)
        </label>
        <input
          id="chem-search"
          type="search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setSelectedCode("");
          }}
          placeholder="Type to search catalog…"
          className={`${ui.input} mt-1`}
          list="chem-suggestions"
        />
        {filtered.length > 0 && search && !selectedCode ? (
          <ul className="mt-1 max-h-40 overflow-y-auto rounded border border-zinc-200 bg-white text-sm shadow-sm">
            {filtered.map((m) => (
              <li key={m.code}>
                <button
                  type="button"
                  onClick={() => pickMaterial(m)}
                  className="block w-full px-3 py-2 text-left hover:bg-zinc-50"
                >
                  {m.name}{" "}
                  <span className="text-zinc-500">
                    ({fmt(m.onHand)} {m.unit} on hand)
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {selected ? (
          <p className="mt-1 text-sm text-emerald-800">
            Selected: <strong>{selected.name}</strong> ({fmt(selected.onHand)} {selected.unit} on hand)
          </p>
        ) : null}
      </div>

      <div>
        <label className={ui.label} htmlFor="chem-new">
          Or new chemical name
        </label>
        <input
          id="chem-new"
          value={newName}
          onChange={(e) => {
            setNewName(e.target.value);
            useNewName();
          }}
          placeholder="If not in catalog, type name here"
          className={`${ui.input} mt-1`}
        />
        <p className="mt-1 text-xs text-zinc-500">
          If the name is not in the list, it will be added automatically on save.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={ui.label} htmlFor="chem-qty">
            Quantity received
          </label>
          <input
            id="chem-qty"
            type="number"
            min={0.001}
            step="any"
            required
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className={`${ui.input} mt-1`}
          />
        </div>
        <div>
          <label className={ui.label} htmlFor="chem-unit">
            Unit
          </label>
          <input
            id="chem-unit"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className={`${ui.input} mt-1`}
          />
        </div>
      </div>

      <div>
        <label className={ui.label} htmlFor="chem-received">
          Received date
        </label>
        <input
          id="chem-received"
          type="date"
          value={receivedAt}
          onChange={(e) => setReceivedAt(e.target.value)}
          className={`${ui.input} mt-1`}
        />
      </div>

      <fieldset className="space-y-2">
        <legend className={ui.label}>QC outcome</legend>
        <div className="flex flex-wrap gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="qcOutcome"
              checked={qcOutcome === "approved"}
              onChange={() => setQcOutcome("approved")}
            />
            Successful — add to stock
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="qcOutcome"
              checked={qcOutcome === "rejected"}
              onChange={() => setQcOutcome("rejected")}
            />
            Unsuccessful — no stock change
          </label>
        </div>
      </fieldset>

      <div>
        <label className={ui.label} htmlFor="chem-comment">
          QC comment {qcOutcome === "rejected" ? "(required)" : "(optional)"}
        </label>
        <textarea
          id="chem-comment"
          value={qcComment}
          onChange={(e) => setQcComment(e.target.value)}
          rows={2}
          className={`${ui.input} mt-1`}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={ui.label} htmlFor="chem-appearance">
            Appearance
          </label>
          <input
            id="chem-appearance"
            value={appearance}
            onChange={(e) => setAppearance(e.target.value)}
            className={`${ui.input} mt-1`}
          />
        </div>
        <div>
          <label className={ui.label} htmlFor="chem-ph">
            pH
          </label>
          <input
            id="chem-ph"
            value={ph}
            onChange={(e) => setPh(e.target.value)}
            className={`${ui.input} mt-1`}
          />
        </div>
        <div>
          <label className={ui.label} htmlFor="chem-solids">
            Solids
          </label>
          <input
            id="chem-solids"
            value={solids}
            onChange={(e) => setSolids(e.target.value)}
            className={`${ui.input} mt-1`}
          />
        </div>
        <div>
          <label className={ui.label} htmlFor="chem-provider">
            Provider
          </label>
          <input
            id="chem-provider"
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className={`${ui.input} mt-1`}
          />
        </div>
      </div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {success ? <p className="text-sm text-emerald-800">{success}</p> : null}

      <button type="submit" disabled={saving} className={ui.btnPrimary}>
        {saving ? "Saving…" : "Save intake"}
      </button>
    </form>
  );
}

export function ChemicalIntakeHistory() {
  const [intakes, setIntakes] = useState<SerializedChemicalIntake[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/chemical-intakes", { credentials: "same-origin" });
      if (res.ok) {
        const data = (await res.json()) as { intakes?: SerializedChemicalIntake[] };
        setIntakes(data.intakes ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <p className="text-sm text-zinc-600">Loading recent intakes…</p>;
  }

  if (intakes.length === 0) {
    return <p className="text-sm text-zinc-600">No intakes recorded yet.</p>;
  }

  return (
    <div className={`${ui.card} overflow-x-auto p-0`}>
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr className="bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600">
            <th className="border-b px-3 py-2">Date</th>
            <th className="border-b px-3 py-2">Material</th>
            <th className="border-b px-3 py-2 text-right">Qty</th>
            <th className="border-b px-3 py-2">QC</th>
            <th className="border-b px-3 py-2">By</th>
          </tr>
        </thead>
        <tbody>
          {intakes.map((i) => (
            <tr key={i.id} className="border-b border-zinc-100">
              <td className="px-3 py-2 text-zinc-600">
                {i.receivedAt ? new Date(i.receivedAt).toLocaleDateString() : "—"}
              </td>
              <td className="px-3 py-2 font-medium">{i.materialName}</td>
              <td className="px-3 py-2 text-right tabular-nums">
                {fmt(i.quantity)} {i.unit}
              </td>
              <td className="px-3 py-2 capitalize">
                {i.qcOutcome === "approved" ? "Successful" : "Unsuccessful"}
              </td>
              <td className="px-3 py-2">{i.recordedByName}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
