"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { EmployeeMultiPicker } from "@/components/EmployeeMultiPicker";
import type { SerializedRashidDailyPlan, WorkRowView } from "@/lib/rashidDailyPlan";
import { computeLineMetrics } from "@/lib/rashidDailyPlan";
import type { RashidPlanProduct } from "@/lib/rashidPlanProducts";
import { formatProductDuty } from "@/lib/rashidPlanProducts";
import { ui } from "@/lib/ui";

type Employee = { id: string; name: string };

type DutyKey = "boxMaking" | "machineCleaning" | "hallOrganization";

type TaskAssignment = {
  enabled: boolean;
  employeeIds: string[];
  baseTarget: string;
};

type ProductBlock = {
  blockId: string;
  productCode: string;
  tasks: Record<string, TaskAssignment>;
};

type ManualRow = {
  lineKey: string;
  employeeIds: string[];
  duty: string;
  baseTarget: string;
  carryIn: number;
  effectiveTarget: number;
};

const DUTY_LABELS: Record<DutyKey, string> = {
  boxMaking: "Box making",
  machineCleaning: "Machine cleaning",
  hallOrganization: "Hall organization / cleaning",
};

type Props = {
  initialDate: string;
  cancelHref?: string;
};

function newBlockId() {
  return `block-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
}

function newManualKey() {
  return `manual-${Date.now().toString(36)}`;
}

function defaultTaskAssignment(employeeIds: string[]): TaskAssignment {
  return { enabled: false, employeeIds, baseTarget: "0" };
}

function initProductBlock(product: RashidPlanProduct, defaultEmployeeIds: string[]): ProductBlock {
  const tasks: Record<string, TaskAssignment> = {};
  for (const t of product.tasks) {
    tasks[t.taskCode] = defaultTaskAssignment(defaultEmployeeIds);
  }
  return { blockId: newBlockId(), productCode: product.productCode, tasks };
}

function rowsToProductBlocks(
  rows: WorkRowView[],
  products: RashidPlanProduct[],
): { blocks: ProductBlock[]; manual: ManualRow[] } {
  const byProduct = new Map<string, ProductBlock>();
  const manual: ManualRow[] = [];

  for (const row of rows) {
    if (row.productCode && row.taskCode) {
      let block = byProduct.get(row.productCode);
      if (!block) {
        const product = products.find((p) => p.productCode === row.productCode);
        if (!product) continue;
        block = initProductBlock(product, [row.employeeId]);
        byProduct.set(row.productCode, block);
      }
      const existing = block.tasks[row.taskCode];
      const employeeIds = existing?.enabled
        ? [...new Set([...existing.employeeIds, row.employeeId])]
        : [row.employeeId];
      block.tasks[row.taskCode] = {
        enabled: true,
        employeeIds,
        baseTarget: String(row.baseTarget),
      };
    } else {
      manual.push({
        lineKey: row.lineKey,
        employeeIds: [row.employeeId],
        duty: row.duty,
        baseTarget: String(row.baseTarget),
        carryIn: row.carryIn,
        effectiveTarget: row.effectiveTarget,
      });
    }
  }

  const manualByDuty = new Map<string, ManualRow>();
  for (const row of manual) {
    const key = `${row.duty.trim().toLowerCase()}::${row.baseTarget}`;
    const existing = manualByDuty.get(key);
    if (existing) {
      existing.employeeIds = [...new Set([...existing.employeeIds, ...row.employeeIds])];
    } else {
      manualByDuty.set(key, row);
    }
  }

  return { blocks: [...byProduct.values()], manual: [...manualByDuty.values()] };
}

export function RashidDailyPlanForm({ initialDate, cancelHref }: Props) {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [products, setProducts] = useState<RashidPlanProduct[]>([]);
  const [metaError, setMetaError] = useState("");
  const [planDate, setPlanDate] = useState(initialDate);
  const [helperEmployeeIds, setHelperEmployeeIds] = useState<string[]>([]);
  const [productBlocks, setProductBlocks] = useState<ProductBlock[]>([]);
  const [manualRows, setManualRows] = useState<ManualRow[]>([]);
  const [duties, setDuties] = useState<Record<DutyKey, string[]>>({
    boxMaking: [],
    machineCleaning: [],
    hallOrganization: [],
  });
  const [addProductCode, setAddProductCode] = useState("");
  const [previousPlanDate, setPreviousPlanDate] = useState<string | null>(null);
  const [dayStatus, setDayStatus] = useState<"planned" | "closed" | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const defaultEmployeeIds = employees[0]?.id ? [employees[0].id] : [];

  const productsByCode = useMemo(() => {
    const m = new Map<string, RashidPlanProduct>();
    for (const p of products) m.set(p.productCode, p);
    return m;
  }, [products]);

  const availableProducts = useMemo(
    () => products.filter((p) => !productBlocks.some((b) => b.productCode === p.productCode)),
    [products, productBlocks],
  );

  useEffect(() => {
    setPlanDate(initialDate);
  }, [initialDate]);

  const loadMeta = useCallback(async () => {
    setMetaError("");
    const [empRes, prodRes] = await Promise.all([
      fetch("/api/admin/production-employees", { credentials: "same-origin" }),
      fetch("/api/admin/rashid-daily-plan/products", {
        credentials: "same-origin",
        cache: "no-store",
      }),
    ]);
    if (empRes.ok) {
      const data = (await empRes.json()) as { employees?: Employee[] };
      setEmployees(data.employees ?? []);
    } else {
      setMetaError("Could not load employee list. Refresh the page or sign in as admin.");
    }
    if (prodRes.ok) {
      const data = (await prodRes.json()) as { products?: RashidPlanProduct[] };
      setProducts(data.products ?? []);
    } else if (!metaError) {
      setMetaError("Could not load product catalog.");
    }
  }, [metaError]);

  const loadPlan = useCallback(
    async (date: string, catalog: RashidPlanProduct[], roster: Employee[]) => {
      setLoading(true);
      setErrors({});
      try {
        const res = await fetch(`/api/admin/rashid-daily-plan?date=${encodeURIComponent(date)}`, {
          credentials: "same-origin",
        });
        const data = (await res.json()) as {
          plan?: SerializedRashidDailyPlan;
          saved?: boolean;
          errors?: Record<string, string>;
          error?: string;
        };
        if (!res.ok) {
          setErrors(data.errors ?? { form: data.error ?? "Could not load plan." });
          return;
        }
        const plan = data.plan!;
        setSaved(Boolean(data.saved));
        setDayStatus(plan.dayStatus);
        const helperIds = plan.helperEmployeeId ? [plan.helperEmployeeId] : [];
        setHelperEmployeeIds(helperIds);
        const { blocks, manual } = rowsToProductBlocks(plan.workRows, catalog);
        setProductBlocks(blocks);
        setManualRows(manual);
        setDuties({
          boxMaking:
            plan.duties.boxMaking.employeeIds.length > 0
              ? plan.duties.boxMaking.employeeIds
              : plan.duties.boxMaking.employeeId
                ? [plan.duties.boxMaking.employeeId]
                : [],
          machineCleaning:
            plan.duties.machineCleaning.employeeIds.length > 0
              ? plan.duties.machineCleaning.employeeIds
              : plan.duties.machineCleaning.employeeId
                ? [plan.duties.machineCleaning.employeeId]
                : [],
          hallOrganization:
            plan.duties.hallOrganization.employeeIds.length > 0
              ? plan.duties.hallOrganization.employeeIds
              : plan.duties.hallOrganization.employeeId
                ? [plan.duties.hallOrganization.employeeId]
                : [],
        });
        setPreviousPlanDate(plan.previousPlanDate);
        if (!roster.length) return;
        if (helperIds.length === 0 && roster[0]) {
          setHelperEmployeeIds([roster[0].id]);
        }
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    if (products.length === 0) return;
    void loadPlan(planDate, products, employees);
  }, [planDate, products, employees, loadPlan]);

  function addProductBlock() {
    const product = productsByCode.get(addProductCode);
    if (!product) return;
    setProductBlocks((prev) => [...prev, initProductBlock(product, defaultEmployeeIds)]);
    setAddProductCode("");
  }

  function removeProductBlock(blockId: string) {
    setProductBlocks((prev) => prev.filter((b) => b.blockId !== blockId));
  }

  function updateProductTask(
    blockId: string,
    taskCode: string,
    patch: Partial<TaskAssignment>,
  ) {
    setProductBlocks((prev) =>
      prev.map((block) => {
        if (block.blockId !== blockId) return block;
        const current = block.tasks[taskCode] ?? defaultTaskAssignment(defaultEmployeeIds);
        return {
          ...block,
          tasks: {
            ...block.tasks,
            [taskCode]: { ...current, ...patch },
          },
        };
      }),
    );
  }

  function addManualRow() {
    setManualRows((prev) => [
      ...prev,
      {
        lineKey: newManualKey(),
        employeeIds: defaultEmployeeIds,
        duty: "",
        baseTarget: "0",
        carryIn: 0,
        effectiveTarget: 0,
      },
    ]);
  }

  function updateManualRow(index: number, patch: Partial<ManualRow>) {
    setManualRows((prev) => {
      const next = [...prev];
      let row = { ...next[index], ...patch };
      const base = Math.max(0, Math.round(Number(row.baseTarget) || 0));
      const { effectiveTarget } = computeLineMetrics(base, row.carryIn, 0);
      row = { ...row, effectiveTarget };
      next[index] = row;
      return next;
    });
  }

  function removeManualRow(index: number) {
    setManualRows((prev) => prev.filter((_, i) => i !== index));
  }

  function handleEmployeeAdded(employee: Employee) {
    setEmployees((prev) => {
      if (prev.some((e) => e.id === employee.id)) return prev;
      return [...prev, employee].sort((a, b) => a.name.localeCompare(b.name));
    });
  }

  const employeePickerProps = {
    allowAddNew: true as const,
    onEmployeeAdded: handleEmployeeAdded,
  };

  function buildWorkRowsPayload() {
    const rows: Array<{
      employeeIds: string[];
      productCode?: string;
      taskCode?: string;
      duty: string;
      baseTarget: number;
    }> = [];

    for (const block of productBlocks) {
      const product = productsByCode.get(block.productCode);
      if (!product) continue;
      for (const task of product.tasks) {
        const assignment = block.tasks[task.taskCode];
        if (!assignment?.enabled || assignment.employeeIds.length === 0) continue;
        rows.push({
          employeeIds: assignment.employeeIds,
          productCode: block.productCode,
          taskCode: task.taskCode,
          duty: formatProductDuty(product.displayName, task.label),
          baseTarget: Number(assignment.baseTarget) || 0,
        });
      }
    }

    for (const row of manualRows) {
      if (!row.duty.trim() || row.employeeIds.length === 0) continue;
      rows.push({
        employeeIds: row.employeeIds,
        duty: row.duty.trim(),
        baseTarget: Number(row.baseTarget) || 0,
      });
    }

    return rows;
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      const workRows = buildWorkRowsPayload();
      const res = await fetch("/api/admin/rashid-daily-plan", {
        method: "PUT",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          date: planDate,
          helperEmployeeIds,
          workRows,
          boxMaking: { employeeIds: duties.boxMaking },
          machineCleaning: { employeeIds: duties.machineCleaning },
          hallOrganization: { employeeIds: duties.hallOrganization },
        }),
      });
      const data = (await res.json()) as {
        redirectTo?: string;
        errors?: Record<string, string>;
        error?: string;
      };
      if (!res.ok) {
        setErrors(data.errors ?? { form: data.error ?? "Could not save." });
        return;
      }
      router.push(data.redirectTo ?? `/admin/rashid-daily-plan/${planDate}`);
    } finally {
      setSaving(false);
    }
  }

  if (dayStatus === "closed") {
    return (
      <div className={`${ui.card} space-y-3 p-4`}>
        <p className="text-sm text-zinc-700">
          This day is already closed. You cannot change the morning plan after status is recorded.
        </p>
        <Link href={`/admin/rashid-daily-plan/${planDate}`} className={ui.btnPrimary}>
          View saved plan
        </Link>
      </div>
    );
  }

  return (
    <form className="space-y-6" onSubmit={onSave}>
      <div className={`${ui.cardVisible} grid gap-4 p-4 sm:grid-cols-2`}>
        <div>
          <label className="block text-sm font-medium text-zinc-800" htmlFor="planDate">
            Date
          </label>
          <input
            id="planDate"
            type="date"
            value={planDate}
            onChange={(e) => setPlanDate(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <EmployeeMultiPicker
            label="Helpers of the day"
            employees={employees}
            value={helperEmployeeIds}
            onChange={setHelperEmployeeIds}
            placeholder="Select one or more helpers…"
            error={errors.helperName}
            {...employeePickerProps}
          />
        </div>
      </div>

      {metaError ? <p className="text-sm text-amber-800">{metaError}</p> : null}

      {previousPlanDate ? (
        <p className="text-sm text-amber-800">
          Carry-in values come from the previous closed plan ({previousPlanDate}) where the same
          employee + task row exists.
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-zinc-600">Loading plan…</p>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <label className="block text-xs font-medium text-zinc-600">Add product</label>
              <select
                value={addProductCode}
                onChange={(e) => setAddProductCode(e.target.value)}
                className="mt-1 min-w-[12rem] rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
              >
                <option value="">Select product…</option>
                {availableProducts.map((p) => (
                  <option key={p.productCode} value={p.productCode}>
                    {p.displayName}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={addProductBlock}
              disabled={!addProductCode}
              className={ui.btnSecondarySm}
            >
              Add product
            </button>
            <button type="button" onClick={addManualRow} className={ui.btnGhost}>
              + Add other duty
            </button>
          </div>

          {productBlocks.map((block) => {
            const product = productsByCode.get(block.productCode);
            if (!product) return null;
            return (
              <div key={block.blockId} className={`${ui.cardVisible} space-y-3 p-4`}>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-zinc-900">{product.displayName}</h3>
                  <button
                    type="button"
                    onClick={() => removeProductBlock(block.blockId)}
                    className="text-xs text-red-700 hover:underline"
                  >
                    Remove product
                  </button>
                </div>
                <div className="space-y-3">
                  {product.tasks.map((task) => {
                    const assignment =
                      block.tasks[task.taskCode] ?? defaultTaskAssignment(defaultEmployeeIds);
                    return (
                      <div
                        key={task.taskCode}
                        className="grid gap-3 rounded-lg border border-zinc-100 bg-zinc-50/50 p-3 sm:grid-cols-[auto_1fr_8rem]"
                      >
                        <label className="flex items-center gap-2 text-sm text-zinc-800 sm:pt-2">
                          <input
                            type="checkbox"
                            checked={assignment.enabled}
                            onChange={(e) =>
                              updateProductTask(block.blockId, task.taskCode, {
                                enabled: e.target.checked,
                              })
                            }
                            className="rounded border-zinc-300"
                          />
                          {task.label}
                        </label>
                        <EmployeeMultiPicker
                          employees={employees}
                          value={assignment.employeeIds}
                          disabled={!assignment.enabled}
                          onChange={(employeeIds) =>
                            updateProductTask(block.blockId, task.taskCode, { employeeIds })
                          }
                          placeholder="Assign people…"
                          {...employeePickerProps}
                        />
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={0}
                            disabled={!assignment.enabled}
                            value={assignment.baseTarget}
                            onChange={(e) =>
                              updateProductTask(block.blockId, task.taskCode, {
                                baseTarget: e.target.value,
                              })
                            }
                            placeholder="Target"
                            className="w-full rounded border border-zinc-200 px-2 py-2 text-right text-sm disabled:opacity-50"
                          />
                          <span className="shrink-0 text-xs text-zinc-500">target</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {manualRows.length > 0 ? (
            <div className={`${ui.cardVisible} space-y-3 p-4`}>
              <h3 className="text-sm font-semibold text-zinc-900">Other duties</h3>
              {manualRows.map((row, index) => (
                <div
                  key={row.lineKey}
                  className="grid gap-3 rounded-lg border border-zinc-100 bg-zinc-50/50 p-3 sm:grid-cols-[1fr_1fr_8rem_auto]"
                >
                  <EmployeeMultiPicker
                    employees={employees}
                    value={row.employeeIds}
                    onChange={(employeeIds) => updateManualRow(index, { employeeIds })}
                    placeholder="Assign people…"
                    {...employeePickerProps}
                  />
                  <input
                    value={row.duty}
                    onChange={(e) => updateManualRow(index, { duty: e.target.value })}
                    className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                    placeholder="e.g. Stacking all"
                  />
                  <input
                    type="number"
                    min={0}
                    value={row.baseTarget}
                    onChange={(e) => updateManualRow(index, { baseTarget: e.target.value })}
                    className="rounded-lg border border-zinc-200 px-3 py-2 text-right text-sm"
                    placeholder="Target"
                  />
                  <button
                    type="button"
                    onClick={() => removeManualRow(index)}
                    className="self-center text-sm text-red-700 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}

      <div className={`${ui.cardVisible} space-y-4 p-4`}>
        <h2 className="text-sm font-semibold text-zinc-900">End-of-day duties</h2>
        <p className="text-xs text-zinc-500">
          Assign one or more people for each end-of-day duty (recorded with the morning plan).
        </p>
        {(Object.keys(DUTY_LABELS) as DutyKey[]).map((key) => (
          <EmployeeMultiPicker
            key={key}
            label={DUTY_LABELS[key]}
            employees={employees}
            value={duties[key]}
            onChange={(employeeIds) => setDuties((prev) => ({ ...prev, [key]: employeeIds }))}
            placeholder="Select people…"
            error={errors[key]}
            {...employeePickerProps}
          />
        ))}
      </div>

      {errors.form ? <p className="text-sm text-red-700">{errors.form}</p> : null}
      {errors.workRows ? <p className="text-sm text-red-700">{errors.workRows}</p> : null}

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={saving || loading} className={ui.btnPrimary}>
          {saving ? "Saving…" : saved ? "Save changes" : "Save morning plan"}
        </button>
        {cancelHref ? (
          <Link href={cancelHref} className={ui.btnGhost}>
            Cancel
          </Link>
        ) : null}
      </div>
    </form>
  );
}
