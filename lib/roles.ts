export type AppRole = "po_creator" | "batch_editor";

const ALLOWED_ROLES: AppRole[] = ["po_creator", "batch_editor"];

export function isAppRole(role: unknown): role is AppRole {
  return typeof role === "string" && ALLOWED_ROLES.includes(role as AppRole);
}

export function homePathForRole(role: AppRole): string {
  return role === "batch_editor" ? "/production/batches" : "/new-order";
}

export function roleFromSession(user: { role?: unknown } | undefined): AppRole | null {
  const role = user?.role;
  return isAppRole(role) ? role : null;
}
