import staticEmployees from "@/data/production-employees.json";

export type ProductionEmployee = {
  id: string;
  name: string;
};

let roster: ProductionEmployee[] = [...(staticEmployees as ProductionEmployee[])];

export function setProductionEmployeeRoster(next: ProductionEmployee[]): void {
  roster = [...next].sort((a, b) => a.name.localeCompare(b.name));
}

export function loadProductionEmployees(): ProductionEmployee[] {
  return [...roster].sort((a, b) => a.name.localeCompare(b.name));
}

export function employeeById(id: string | undefined | null): ProductionEmployee | null {
  const key = id?.trim().toLowerCase() ?? "";
  if (!key) return null;
  return roster.find((e) => e.id.toLowerCase() === key) ?? null;
}

export function employeeByName(name: string): ProductionEmployee | null {
  const key = name.trim().toLowerCase();
  if (!key) return null;
  return roster.find((e) => e.name.trim().toLowerCase() === key) ?? null;
}

export function employeeNamesByIds(ids: string[]): string {
  const names = ids
    .map((id) => employeeById(id)?.name ?? "")
    .filter(Boolean);
  return names.join(" + ");
}

export function validateEmployeeIds(ids: string[]): string | null {
  for (const id of ids) {
    if (!employeeById(id)) return `Unknown employee: ${id}`;
  }
  return null;
}

export function slugifyEmployeeName(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/^-+|-+$/g, "");
  return slug || "employee";
}

export function uniqueEmployeeId(name: string, existing: ProductionEmployee[]): string {
  const base = slugifyEmployeeName(name);
  const taken = new Set(existing.map((e) => e.id.toLowerCase()));
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

export function buildNewEmployee(name: string, existing?: ProductionEmployee[]): ProductionEmployee {
  const trimmed = name.trim();
  const list = existing ?? roster;
  return {
    id: uniqueEmployeeId(trimmed, list),
    name: trimmed,
  };
}
