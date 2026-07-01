import fs from "fs";
import path from "path";

import {
  buildNewEmployee,
  employeeByName,
  loadProductionEmployees,
  setProductionEmployeeRoster,
  type ProductionEmployee,
} from "@/lib/productionEmployees";

const DATA_PATH = path.join(process.cwd(), "data", "production-employees.json");

export function readProductionEmployeesFromDisk(): ProductionEmployee[] {
  const raw = fs.readFileSync(DATA_PATH, "utf8");
  const parsed = JSON.parse(raw) as ProductionEmployee[];
  if (!Array.isArray(parsed)) {
    throw new Error("Invalid production-employees.json");
  }
  return parsed.filter(
    (e) => e && typeof e.id === "string" && typeof e.name === "string" && e.name.trim().length > 0,
  );
}

export function syncProductionEmployeesFromDisk(): ProductionEmployee[] {
  const list = readProductionEmployeesFromDisk();
  setProductionEmployeeRoster(list);
  return loadProductionEmployees();
}

export function addProductionEmployeeToDisk(
  name: string,
): { employee: ProductionEmployee } | { error: string } {
  const trimmed = name.trim();
  if (trimmed.length < 2) {
    return { error: "Name must be at least 2 characters." };
  }

  const roster = syncProductionEmployeesFromDisk();
  const existing = employeeByName(trimmed);
  if (existing) {
    return { employee: existing };
  }

  const employee = buildNewEmployee(trimmed, roster);
  const next = [...roster, employee].sort((a, b) => a.name.localeCompare(b.name));
  fs.writeFileSync(DATA_PATH, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  setProductionEmployeeRoster(next);
  return { employee };
}
