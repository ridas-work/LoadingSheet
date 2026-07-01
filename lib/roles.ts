import { isFieldVisitRep } from "@/lib/fieldVisitTickets";

export type AppRole =
  | "po_creator"
  | "batch_editor"
  | "dispatch_editor"
  | "packaging_editor"
  | "chemicals_editor"
  | "gate_guard"
  | "admin";

const ALLOWED_ROLES: AppRole[] = [
  "po_creator",
  "batch_editor",
  "dispatch_editor",
  "packaging_editor",
  "chemicals_editor",
  "gate_guard",
  "admin",
];

export function isAppRole(role: unknown): role is AppRole {
  return typeof role === "string" && ALLOWED_ROLES.includes(role as AppRole);
}

/** Ali — creates dispatch trips and picks POs. Rashid assigns batches and weights. */
const DISPATCH_TRIP_PLANNER_USERNAME = "ali";

export function homePathForRole(role: AppRole, username?: string | null): string {
  if (role === "admin") return "/admin";
  if (role === "batch_editor") return "/production/batches";
  if (role === "dispatch_editor") {
    const u = username?.toLowerCase().trim() ?? "";
    if (u === DISPATCH_TRIP_PLANNER_USERNAME) return "/orders";
    return "/dispatch/trips";
  }
  if (role === "packaging_editor") return "/dispatch/inventory";
  if (role === "chemicals_editor") return "/chemicals/inventory";
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

/** Nouman, Javeria, Aslam & Ahtisham — field visit / sample ticket workflow. */
export function canAccessFieldVisits(role: AppRole | null, username: string | undefined | null): boolean {
  if (role === "admin") return true;
  return role === "po_creator" && isFieldVisitRep(username);
}

export function canEditProductionBatches(role: AppRole | null): boolean {
  return role === "batch_editor";
}

/** Ali (and admin) — create trips, pick POs, enter vehicle details. */
export function isDispatchTripPlanner(role: AppRole | null, username?: string | null): boolean {
  if (role === "admin") return true;
  if (role !== "dispatch_editor") return false;
  return (username?.toLowerCase().trim() ?? "") === DISPATCH_TRIP_PLANNER_USERNAME;
}

/** Rashid (and admin) — assign batches, carton weights, filling, inventory. */
export function isDispatchBatchOperator(role: AppRole | null, username?: string | null): boolean {
  if (role === "admin") return true;
  if (role !== "dispatch_editor") return false;
  return !isDispatchTripPlanner(role, username);
}

/** Rashid only — not Ali, not admin. Used to hide delivered POs from his portal. */
export function isRashidDispatchUser(role: AppRole | null, username?: string | null): boolean {
  return role === "dispatch_editor" && !isDispatchTripPlanner(role, username);
}

export function canCreateDispatchTrips(role: AppRole | null, username?: string | null): boolean {
  return isDispatchTripPlanner(role, username);
}

/** Ali (trip planner), Rashid, or admin — edit vehicle/driver and PO list on a dispatch trip. */
export function canEditDispatchTrip(role: AppRole | null, username?: string | null): boolean {
  return isAdmin(role) || role === "dispatch_editor";
}

export function canAssignDispatchBatches(role: AppRole | null, username?: string | null): boolean {
  return isDispatchBatchOperator(role, username);
}

/** Filling and ready stock on the dispatch side (Rashid). */
export function canEditDispatch(role: AppRole | null, username?: string | null): boolean {
  return canAssignDispatchBatches(role, username);
}

/** Rashid portal — view Waleed's morning plan (read-only). */
export function canViewRashidDailyPlan(role: AppRole | null, username?: string | null): boolean {
  return isAdmin(role) || isDispatchBatchOperator(role, username);
}

/** Rashid (or Waleed admin) — record end-of-day status and close the day. */
export function canRecordRashidDailyPlanStatus(
  role: AppRole | null,
  username?: string | null,
): boolean {
  return canViewRashidDailyPlan(role, username);
}

/** Rashid — read-only PO detail for orders with lines pending for later dispatch. */
export function canViewRashidPoOrders(role: AppRole | null, username?: string | null): boolean {
  return isDispatchBatchOperator(role, username);
}

/** Waleed admin only — create/edit morning plan targets. */
export function canEditRashidMorningPlan(role: AppRole | null): boolean {
  return isAdmin(role);
}

export function canViewPackagingInventory(role: AppRole | null): boolean {
  return role === "packaging_editor" || role === "admin";
}

export function canEditPackagingInventory(role: AppRole | null): boolean {
  return role === "packaging_editor";
}

/** Ramazan, Esha (catalog read), or Waleed admin. */
export function canViewChemicalMaterials(role: AppRole | null): boolean {
  return role === "chemicals_editor" || role === "batch_editor" || role === "admin";
}

/** Waleed admin only — manual stock refill / adjust. */
export function canEditChemicalStock(role: AppRole | null): boolean {
  return role === "admin";
}

/** Esha or Waleed — record QC intake on incoming chemicals. */
export function canRecordChemicalIntake(role: AppRole | null): boolean {
  return role === "batch_editor" || role === "admin";
}

export function canRequestChemicalMaterials(role: AppRole | null): boolean {
  return role === "chemicals_editor";
}

export function canReviewChemicalRequests(role: AppRole | null): boolean {
  return role === "admin";
}

/** Nouman, Aslam, Ahtisham & Javeria — PO entry with customer directory dropdown. */
export function canUseCustomerDirectory(role: AppRole | null, username?: string | null): boolean {
  if (role === "admin") return true;
  return isPoOrderEditor(role, username);
}

/** Nouman, Aslam, Ahtisham & Javeria — edit their own POs (add/remove products) like Waleed. */
const PO_ORDER_EDITOR_USERNAMES = new Set(["nouman", "aslam", "ahtisham", "javeria"]);

/** Nouman — read-only boss summaries (orders matrix + delivered/pending). Waleed uses admin role. */
const ADMIN_SUMMARY_VIEWER_USERNAMES = new Set(["nouman"]);

export function isPoOrderEditor(role: AppRole | null, username: string | undefined | null): boolean {
  if (role !== "po_creator") return false;
  const u = username?.toLowerCase().trim() ?? "";
  return PO_ORDER_EDITOR_USERNAMES.has(u);
}

export function canViewAdminSummary(role: AppRole | null, username?: string | null): boolean {
  if (role === "admin") return true;
  if (role !== "po_creator") return false;
  const u = username?.toLowerCase().trim() ?? "";
  return ADMIN_SUMMARY_VIEWER_USERNAMES.has(u);
}

/** Waleed admin only — operations reports hub (not Nouman summary viewer). */
export function canViewAdminReports(role: AppRole | null): boolean {
  return isAdmin(role);
}

/** Boss (Waleed) or designated PO creators — edit PO lines after creation. */
export function canEditOrders(role: AppRole | null, username?: string | null): boolean {
  if (role === "admin") return true;
  return isPoOrderEditor(role, username);
}

/** Waleed only — mark subtracted lines sent/discarded on loading sheet. */
export function canManageSubtractedItems(role: AppRole | null): boolean {
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
