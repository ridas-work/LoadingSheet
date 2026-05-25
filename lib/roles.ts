export type AppRole =
  | "po_creator"
  | "batch_editor"
  | "dispatch_editor"
  | "packaging_editor"
  | "gate_guard"
  | "admin";

const ALLOWED_ROLES: AppRole[] = [
  "po_creator",
  "batch_editor",
  "dispatch_editor",
  "packaging_editor",
  "gate_guard",
  "admin",
];

export function isAppRole(role: unknown): role is AppRole {
  return typeof role === "string" && ALLOWED_ROLES.includes(role as AppRole);
}

export function homePathForRole(role: AppRole): string {
  if (role === "admin") return "/admin";
  if (role === "batch_editor") return "/production/batches";
  if (role === "dispatch_editor") return "/dispatch/trips";
  if (role === "packaging_editor") return "/dispatch/inventory";
  if (role === "gate_guard") return "/gate/orders";
  return "/new-order";
}

export function roleFromSession(user: { role?: unknown } | undefined): AppRole | null {
  const role = user?.role;
  return isAppRole(role) ? role : null;
}

export function isAdmin(role: AppRole | null): boolean {
  return role === "admin";
}

/** Boss / management read-only oversight across orders, batches, and dispatch. */
export function adminCanViewOperations(role: AppRole | null): boolean {
  return isAdmin(role);
}

export function canCreateOrders(role: AppRole | null): boolean {
  return role === "po_creator";
}

export function canEditProductionBatches(role: AppRole | null): boolean {
  return role === "batch_editor";
}

export function canEditDispatch(role: AppRole | null): boolean {
  return role === "dispatch_editor";
}

export function canViewPackagingInventory(role: AppRole | null): boolean {
  return role === "packaging_editor" || role === "admin";
}

export function canEditPackagingInventory(role: AppRole | null): boolean {
  return role === "packaging_editor";
}

/** Boss (Waleed) — correct PO lines / customer details after creation. */
export function canEditOrders(role: AppRole | null): boolean {
  return role === "admin";
}

export function canViewGateOrders(role: AppRole | null): boolean {
  return role === "gate_guard" || role === "admin";
}

/** Zaman — gate out / delivered / pending redelivery. */
export function canEditGateDelivery(role: AppRole | null): boolean {
  return role === "gate_guard";
}

export type DispatchFields = {
  vehicleNo: string;
  driverName: string;
  dcNo: string;
  helperName: string;
  productionIncharge: string;
  securityName: string;
  driverSignature: string;
};

export const EMPTY_DISPATCH: DispatchFields = {
  vehicleNo: "",
  driverName: "",
  dcNo: "",
  helperName: "",
  productionIncharge: "",
  securityName: "",
  driverSignature: "",
};
