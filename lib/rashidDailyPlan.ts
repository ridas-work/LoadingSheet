import templateRows from "@/data/rashid-daily-plan-template.json";

import type { RashidDailyPlanDoc } from "@/lib/models/RashidDailyPlan";
import { employeeById, employeeNamesByIds } from "@/lib/productionEmployees";
import {
  dutyLabelForProductTask,
  productTaskLineKey,
  validateProductTask,
} from "@/lib/rashidPlanProducts";

export type WorkRowInput = {
  lineKey?: string;
  employeeId: string;
  productCode?: string;
  taskCode?: string;
  duty: string;
  baseTarget: number;
  statusAchieved?: number;
};

export type WorkRowView = {
  lineKey: string;
  employeeId: string;
  employeeName: string;
  productCode: string;
  taskCode: string;
  duty: string;
  baseTarget: number;
  carryIn: number;
  effectiveTarget: number;
  statusAchieved: number;
  carryOut: number;
};

export type DutyAssignment = {
  employeeId: string;
  employeeIds: string[];
  employeeNames: string;
};

export type SerializedRashidDailyPlan = {
  planDate: string;
  helperEmployeeId: string;
  helperName: string;
  workRows: WorkRowView[];
  duties: {
    boxMaking: DutyAssignment;
    machineCleaning: DutyAssignment;
    hallOrganization: DutyAssignment;
  };
  previousPlanDate: string | null;
  previousDayClosed: boolean;
  dayStatus: "planned" | "closed";
  statusRecordedAt: string | null;
  statusRecordedByName: string;
  recordedByName: string;
  updatedAt: string | null;
};

export type RashidDailyPlanListItem = {
  planDate: string;
  helperName: string;
  dayStatus: "planned" | "closed";
  rowCount: number;
  updatedAt: string | null;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function slugifyDuty(duty: string): string {
  return duty
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function workRowLineKey(employeeId: string, duty: string): string {
  return `${employeeId.trim().toLowerCase()}::${slugifyDuty(duty)}`;
}

export function resolveWorkRowLineKey(input: WorkRowInput): string {
  const productCode = input.productCode?.trim() ?? "";
  const taskCode = input.taskCode?.trim() ?? "";
  if (productCode && taskCode) {
    return productTaskLineKey(input.employeeId, productCode, taskCode);
  }
  if (input.lineKey?.trim()) return input.lineKey.trim();
  return workRowLineKey(input.employeeId, input.duty);
}

export function parsePlanDate(isoDate: string): Date | null {
  if (!ISO_DATE.test(isoDate)) return null;
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) {
    return null;
  }
  return dt;
}

export function formatPlanDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function previousCalendarDate(isoDate: string): string | null {
  const dt = parsePlanDate(isoDate);
  if (!dt) return null;
  dt.setUTCDate(dt.getUTCDate() - 1);
  return formatPlanDate(dt);
}

export function todayPlanDateIso(): string {
  const now = new Date();
  return formatPlanDate(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())));
}

export function computeLineMetrics(
  baseTarget: number,
  carryIn: number,
  statusAchieved: number,
): { effectiveTarget: number; carryOut: number } {
  const base = Math.max(0, Math.round(baseTarget));
  const carry = Math.max(0, Math.round(carryIn));
  const status = Math.max(0, Math.round(statusAchieved));
  const effectiveTarget = base + carry;
  const carryOut = Math.max(0, effectiveTarget - status);
  return { effectiveTarget, carryOut };
}

export function carryInForLine(
  previousPlan: RashidDailyPlanDoc | null | undefined,
  lineKey: string,
): number {
  if (!previousPlan?.workRows?.length || previousPlan.dayStatus !== "closed") return 0;
  const row = previousPlan.workRows.find((r) => r.lineKey === lineKey);
  return row?.carryOut ?? 0;
}

export function defaultTemplateRows(): WorkRowInput[] {
  return (templateRows as { employeeId: string; duty: string; baseTarget: number }[]).map((r) => ({
    employeeId: r.employeeId,
    duty: r.duty,
    baseTarget: r.baseTarget,
    statusAchieved: 0,
  }));
}

export function parseHelperInput(body: {
  helperName?: unknown;
  helperEmployeeId?: unknown;
}): { helperName: string; helperEmployeeId: string } | { errors: Record<string, string> } {
  const rawName = typeof body.helperName === "string" ? body.helperName.trim() : "";
  const rawId = typeof body.helperEmployeeId === "string" ? body.helperEmployeeId.trim() : "";

  let helperName = rawName;
  let helperEmployeeId = rawId;

  if (!helperName && helperEmployeeId) {
    const emp = employeeById(helperEmployeeId);
    if (emp) helperName = emp.name;
  }

  if (helperName && !helperEmployeeId) {
    const match = employeeById(
      helperName
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, ""),
    );
    if (match && match.name.toLowerCase() === helperName.toLowerCase()) {
      helperEmployeeId = match.id;
    }
  }

  if (helperName.length < 2) {
    return { errors: { helperName: "Helper name is required (at least 2 characters)." } };
  }

  return { helperName, helperEmployeeId };
}

function normalizeDutyAssignment(
  raw:
    | { employeeId?: string | null; employeeIds?: string[] | null; employeeNames?: string | null }
    | null
    | undefined,
): DutyAssignment {
  const legacyIds = raw?.employeeIds ?? [];
  const employeeId = raw?.employeeId?.trim() || legacyIds[0]?.trim() || "";
  const employeeIds = employeeId ? [employeeId] : legacyIds;
  const employeeNames =
    raw?.employeeNames?.trim() ||
    (employeeId ? (employeeById(employeeId)?.name ?? "") : employeeNamesByIds(legacyIds));
  return { employeeId, employeeIds, employeeNames };
}

function buildRowView(
  input: WorkRowInput,
  carryIn: number,
): WorkRowView | { error: string } {
  const emp = employeeById(input.employeeId);
  if (!emp) return { error: `Unknown employee: ${input.employeeId}` };

  const productCode = input.productCode?.trim() ?? "";
  const taskCode = input.taskCode?.trim() ?? "";
  let duty = input.duty.trim();

  if (productCode && taskCode) {
    const catalogDuty = dutyLabelForProductTask(productCode, taskCode);
    if (!catalogDuty) return { error: validateProductTask(productCode, taskCode) ?? "Invalid product task." };
    duty = catalogDuty;
  } else if (!duty) {
    return { error: "Duty label is required." };
  }

  const lineKey = resolveWorkRowLineKey({ ...input, duty, productCode, taskCode });
  const baseTarget = Math.max(0, Math.round(Number(input.baseTarget) || 0));
  const statusAchieved = Math.max(0, Math.round(Number(input.statusAchieved) || 0));
  const { effectiveTarget, carryOut } = computeLineMetrics(baseTarget, carryIn, statusAchieved);

  return {
    lineKey,
    employeeId: emp.id,
    employeeName: emp.name,
    productCode,
    taskCode,
    duty,
    baseTarget,
    carryIn,
    effectiveTarget,
    statusAchieved,
    carryOut,
  };
}

export function buildWorkRowsFromInputs(
  inputs: WorkRowInput[],
  previousPlan: RashidDailyPlanDoc | null | undefined,
): { rows: WorkRowView[] } | { errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const rows: WorkRowView[] = [];
  inputs.forEach((input, index) => {
    const lineKey = resolveWorkRowLineKey(input);
    const carryIn = carryInForLine(previousPlan, lineKey);
    const built = buildRowView({ ...input, lineKey }, carryIn);
    if ("error" in built) {
      errors[`workRows.${index}`] = built.error;
    } else {
      rows.push(built);
    }
  });
  if (Object.keys(errors).length > 0) return { errors };
  return { rows };
}

function emptyDuty(): DutyAssignment {
  return { employeeId: "", employeeIds: [], employeeNames: "" };
}

function serializeDuties(doc: RashidDailyPlanDoc | null | undefined): SerializedRashidDailyPlan["duties"] {
  return {
    boxMaking: normalizeDutyAssignment(doc?.duties?.boxMaking),
    machineCleaning: normalizeDutyAssignment(doc?.duties?.machineCleaning),
    hallOrganization: normalizeDutyAssignment(doc?.duties?.hallOrganization),
  };
}

export function buildPlanView(
  planDateIso: string,
  existing: RashidDailyPlanDoc | null | undefined,
  previous: RashidDailyPlanDoc | null | undefined,
): SerializedRashidDailyPlan {
  const inputs: WorkRowInput[] = existing?.workRows?.length
    ? existing.workRows.map((r) => ({
        lineKey: r.lineKey,
        employeeId: r.employeeId,
        productCode: r.productCode ?? "",
        taskCode: r.taskCode ?? "",
        duty: r.duty,
        baseTarget: r.baseTarget,
        statusAchieved: r.statusAchieved,
      }))
    : [];

  const built = buildWorkRowsFromInputs(inputs, previous);
  const workRows = "rows" in built ? built.rows : [];

  const prevDate = previousCalendarDate(planDateIso);
  const previousPlanDate =
    previous && prevDate ? formatPlanDate(new Date(previous.planDate)) : null;

  return {
    planDate: planDateIso,
    helperEmployeeId: existing?.helperEmployeeId ?? "",
    helperName: existing?.helperName?.trim() ?? "",
    workRows,
    duties: serializeDuties(existing),
    previousPlanDate,
    previousDayClosed: previous?.dayStatus === "closed",
    dayStatus: existing?.dayStatus === "closed" ? "closed" : "planned",
    statusRecordedAt: existing?.statusRecordedAt
      ? new Date(existing.statusRecordedAt).toISOString()
      : null,
    statusRecordedByName: existing?.statusRecordedByName ?? "",
    recordedByName: existing?.recordedByName ?? "",
    updatedAt: existing?.updatedAt ? new Date(existing.updatedAt).toISOString() : null,
  };
}

export function buildWorkRowsForMorningPlan(
  inputs: WorkRowInput[],
  previousPlan: RashidDailyPlanDoc | null | undefined,
): { rows: WorkRowView[] } | { errors: Record<string, string> } {
  const morningInputs = inputs.map((r) => ({ ...r, statusAchieved: 0 }));
  return buildWorkRowsFromInputs(morningInputs, previousPlan);
}

export function applyStatusUpdates(
  existing: RashidDailyPlanDoc,
  statusByLineKey: Map<string, number>,
  previousPlan: RashidDailyPlanDoc | null | undefined,
): { rows: WorkRowView[] } | { errors: Record<string, string> } {
  const inputs: WorkRowInput[] = (existing.workRows ?? []).map((r) => ({
    lineKey: r.lineKey,
    employeeId: r.employeeId,
    productCode: r.productCode ?? "",
    taskCode: r.taskCode ?? "",
    duty: r.duty,
    baseTarget: r.baseTarget,
    statusAchieved: statusByLineKey.has(r.lineKey)
      ? statusByLineKey.get(r.lineKey)!
      : r.statusAchieved ?? 0,
  }));
  return buildWorkRowsFromInputs(inputs, previousPlan);
}

export function serializePlanListItem(doc: RashidDailyPlanDoc): RashidDailyPlanListItem {
  return {
    planDate: formatPlanDate(new Date(doc.planDate)),
    helperName: doc.helperName ?? "",
    dayStatus: doc.dayStatus === "closed" ? "closed" : "planned",
    rowCount: doc.workRows?.length ?? 0,
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : null,
  };
}

export function parseDutyAssignments(body: Record<string, unknown>): {
  duties?: SerializedRashidDailyPlan["duties"];
  errors?: Record<string, string>;
} {
  const errors: Record<string, string> = {};
  const keys = ["boxMaking", "machineCleaning", "hallOrganization"] as const;
  const duties = {} as SerializedRashidDailyPlan["duties"];

  for (const key of keys) {
    const raw = body[key] as { employeeId?: unknown; employeeIds?: unknown } | undefined;
    let employeeId = typeof raw?.employeeId === "string" ? raw.employeeId.trim() : "";
    if (!employeeId && Array.isArray(raw?.employeeIds) && raw.employeeIds.length > 0) {
      const first = raw.employeeIds.find((x): x is string => typeof x === "string" && x.trim().length > 0);
      employeeId = first?.trim() ?? "";
    }
    if (!employeeId) {
      errors[key] = "Select an employee.";
      continue;
    }
    const emp = employeeById(employeeId);
    if (!emp) {
      errors[key] = `Unknown employee: ${employeeId}`;
      continue;
    }
    duties[key] = {
      employeeId: emp.id,
      employeeIds: [emp.id],
      employeeNames: emp.name,
    };
  }

  if (Object.keys(errors).length > 0) return { errors };
  return { duties };
}

export function parseWorkRowInputs(raw: unknown): { rows?: WorkRowInput[]; errors?: Record<string, string> } {
  if (!Array.isArray(raw)) {
    return { errors: { workRows: "Work rows are required." } };
  }
  const rows: WorkRowInput[] = [];
  const errors: Record<string, string> = {};
  raw.forEach((item, index) => {
    if (!item || typeof item !== "object") {
      errors[`workRows.${index}`] = "Invalid row.";
      return;
    }
    const o = item as Record<string, unknown>;
    const employeeId = typeof o.employeeId === "string" ? o.employeeId.trim() : "";
    const productCode = typeof o.productCode === "string" ? o.productCode.trim() : "";
    const taskCode = typeof o.taskCode === "string" ? o.taskCode.trim() : "";
    const duty = typeof o.duty === "string" ? o.duty.trim() : "";

    if (!employeeId) errors[`workRows.${index}.employeeId`] = "Employee required.";

    if (productCode && taskCode) {
      const err = validateProductTask(productCode, taskCode);
      if (err) errors[`workRows.${index}`] = err;
    } else if (!duty) {
      errors[`workRows.${index}.duty`] = "Duty required.";
    }

    rows.push({
      lineKey: typeof o.lineKey === "string" ? o.lineKey.trim() : undefined,
      employeeId,
      productCode: productCode || undefined,
      taskCode: taskCode || undefined,
      duty: duty || (productCode && taskCode ? "pending" : ""),
      baseTarget: typeof o.baseTarget === "number" ? o.baseTarget : Number(o.baseTarget) || 0,
      statusAchieved:
        typeof o.statusAchieved === "number" ? o.statusAchieved : Number(o.statusAchieved) || 0,
    });
  });
  if (Object.keys(errors).length > 0) return { errors };
  return { rows };
}
