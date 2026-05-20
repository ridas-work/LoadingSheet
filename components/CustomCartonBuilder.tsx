"use client";

export type CartonContentRow = { id: string; productName: string; bottles: string };

export type CustomCartonDraft = {
  id: string;
  boxCount: string;
  label: string;
  rows: CartonContentRow[];
};

function rid() {
  return `c${Math.random().toString(36).slice(2, 11)}`;
}

export function emptyContentRow(): CartonContentRow {
  return { id: rid(), productName: "", bottles: "" };
}

export function emptyCartonDraft(): CustomCartonDraft {
  return {
    id: rid(),
    boxCount: "1",
    label: "",
    rows: [emptyContentRow()],
  };
}

export function draftsFromSavedCartons(
  cartons: Array<{ boxCount: number; contents: Array<{ productName: string; bottles: number }>; label?: string }>,
): CustomCartonDraft[] {
  return cartons.map((c) => ({
    id: rid(),
    boxCount: String(c.boxCount),
    label: typeof c.label === "string" ? c.label : "",
    rows: c.contents.map((row) => ({
      id: rid(),
      productName: row.productName,
      bottles: String(row.bottles),
    })),
  }));
}

export function buildCustomCartonsPayload(drafts: CustomCartonDraft[]): Array<{
  boxCount: number;
  contents: Array<{ productName: string; bottles: number }>;
  label?: string;
}> {
  const out: Array<{
    boxCount: number;
    contents: Array<{ productName: string; bottles: number }>;
    label?: string;
  }> = [];
  for (const c of drafts) {
    const boxCount = Number(c.boxCount);
    if (!Number.isInteger(boxCount) || boxCount < 1) continue;
    const contents: Array<{ productName: string; bottles: number }> = [];
    for (const r of c.rows) {
      const pn = r.productName.trim();
      const b = Number(r.bottles);
      if (!pn) continue;
      if (!Number.isInteger(b) || b < 1) continue;
      contents.push({ productName: pn, bottles: b });
    }
    if (contents.length === 0) continue;
    const label = c.label.trim();
    out.push({
      boxCount,
      contents,
      ...(label ? { label } : {}),
    });
  }
  return out;
}

type Props = {
  cartons: CustomCartonDraft[];
  onChange: (next: CustomCartonDraft[]) => void;
  disabled?: boolean;
};

export function CustomCartonBuilder({ cartons, onChange, disabled }: Props) {
  function updateCarton(index: number, patch: Partial<CustomCartonDraft>) {
    onChange(cartons.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }

  function updateRow(cartonIndex: number, rowId: string, patch: Partial<CartonContentRow>) {
    const c = cartons[cartonIndex];
    if (!c) return;
    const rows = c.rows.map((r) => (r.id === rowId ? { ...r, ...patch } : r));
    updateCarton(cartonIndex, { rows });
  }

  function addRow(cartonIndex: number) {
    const c = cartons[cartonIndex];
    if (!c) return;
    updateCarton(cartonIndex, { rows: [...c.rows, emptyContentRow()] });
  }

  function removeRow(cartonIndex: number, rowId: string) {
    const c = cartons[cartonIndex];
    if (!c || c.rows.length <= 1) return;
    updateCarton(cartonIndex, { rows: c.rows.filter((r) => r.id !== rowId) });
  }

  function removeCarton(index: number) {
    onChange(cartons.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-4">
      <div className="text-sm font-medium text-zinc-900">Custom cartons (optional)</div>
      <p className="text-xs text-zinc-600">
        Pack several different products in one physical carton — e.g. pouches and bottles together. Each custom
        carton appears as its own row on the loading sheet (like a mixed box). Standard lines above stay separate.
      </p>
      {cartons.map((carton, ci) => (
        <div
          key={carton.id}
          className="rounded-lg border border-zinc-200 bg-zinc-50/80 p-4 ring-1 ring-zinc-100"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <span className="text-sm font-medium text-zinc-800">Custom carton {ci + 1}</span>
            <button
              type="button"
              disabled={disabled}
              onClick={() => removeCarton(ci)}
              className="text-xs font-medium text-red-700 hover:underline disabled:opacity-50"
            >
              Remove carton
            </button>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-zinc-700" htmlFor={`cc-${carton.id}-count`}>
                Identical physical cartons
              </label>
              <input
                id={`cc-${carton.id}-count`}
                type="text"
                inputMode="numeric"
                disabled={disabled}
                value={carton.boxCount}
                onChange={(e) => updateCarton(ci, { boxCount: e.target.value })}
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-700" htmlFor={`cc-${carton.id}-label`}>
                Label on sheet (optional)
              </label>
              <input
                id={`cc-${carton.id}-label`}
                type="text"
                disabled={disabled}
                value={carton.label}
                onChange={(e) => updateCarton(ci, { label: e.target.value })}
                placeholder="Auto from products if empty"
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm"
              />
            </div>
          </div>
          <div className="mt-3 space-y-2">
            <div className="text-xs font-medium text-zinc-700">Products inside this carton</div>
            {carton.rows.map((row) => (
              <div key={row.id} className="flex flex-wrap items-end gap-2">
                <div className="min-w-[10rem] flex-1">
                  <input
                    type="text"
                    disabled={disabled}
                    value={row.productName}
                    onChange={(e) => updateRow(ci, row.id, { productName: e.target.value })}
                    placeholder="Product name"
                    className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm"
                  />
                </div>
                <div className="w-24">
                  <input
                    type="text"
                    inputMode="numeric"
                    disabled={disabled}
                    value={row.bottles}
                    onChange={(e) => updateRow(ci, row.id, { bottles: e.target.value })}
                    placeholder="Bottles"
                    className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm"
                  />
                </div>
                <button
                  type="button"
                  disabled={disabled || carton.rows.length <= 1}
                  onClick={() => removeRow(ci, row.id)}
                  className="rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-700 disabled:opacity-40"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              disabled={disabled}
              onClick={() => addRow(ci)}
              className="text-xs font-medium text-zinc-700 underline"
            >
              + Add product line
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange([...cartons, emptyCartonDraft()])}
        className="rounded-lg border border-dashed border-zinc-400 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
      >
        + Add custom carton
      </button>
    </div>
  );
}
