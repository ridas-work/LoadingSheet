export type AppRole = "po_creator" | "batch_editor" | "dispatch_editor";

const ALLOWED_ROLES: AppRole[] = ["po_creator", "batch_editor", "dispatch_editor"];

export function isAppRole(role: unknown): role is AppRole {
  return typeof role === "string" && ALLOWED_ROLES.includes(role as AppRole);
}

export function homePathForRole(role: AppRole): string {
  if (role === "batch_editor") return "/production/batches";
  if (role === "dispatch_editor") return "/orders";
  return "/new-order";
}

export function roleFromSession(user: { role?: unknown } | undefined): AppRole | null {
  const role = user?.role;
  return isAppRole(role) ? role : null;
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
