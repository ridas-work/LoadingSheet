import { isFieldVisitRep } from "@/lib/fieldVisitTickets";

export type AppRole =
  | "po_creator"
  | "batch_editor"
  | "dispatch_editor"
  | "chemicals_editor"
  | "gate_guard"
  | "account_opener"
  | "admin";

const ALLOWED_ROLES: AppRole[] = [
  "po_creator",
  "batch_editor",
  "dispatch_editor",
  "chemicals_editor",
  "gate_guard",
  "account_opener",
  "admin",
];

export function isAppRole(role: unknown): role is AppRole {
  return typeof role === "string" && ALLOWED_ROLES.includes(role as AppRole);
}

/** Ali — creates dispatch trips and picks POs. Rashid assigns batches and weights. */
const DISPATCH_TRIP_PLANNER_USERNAME = "ali";

/** Nouman — read-only boss summaries and selected oversight pages. */
const ADMIN_SUMMARY_VIEWER_USERNAMES = new Set(["nouman"]);

export function homePathForRole(role: AppRole, username?: string | null): string {
  if (role === "admin") return "/admin";
  if (role === "po_creator") {
    const u = username?.toLowerCase().trim() ?? "";
    if (ADMIN_SUMMARY_VIEWER_USERNAMES.has(u)) return "/admin";
  }
  if (role === "batch_editor") return "/production/batches";
  if (role === "dispatch_editor") {
    const u = username?.toLowerCase().trim() ?? "";
    if (u === DISPATCH_TRIP_PLANNER_USERNAME) return "/orders";
    return "/dispatch/trips";
  }
  if (role === "chemicals_editor") return "/chemicals/inventory";
  if (role === "gate_guard") return "/gate/orders";
  if (role === "account_opener") return "/accounts/open";
  return "/new-order";
}

/** Account opener (and admin) — register new customer accounts. */
export function canOpenCustomerAccounts(role: AppRole | null): boolean {
  return role === "account_opener" || role === "admin";
}

/** Account opener, admin, and PO reps — read the customer directory for pickers. */
export function canViewCustomerAccounts(role: AppRole | null): boolean {
  return role === "account_opener" || role === "admin";
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

/** PO team and Ali — not Rashid, Ramazan, or packaging. */
export function canViewOrdersList(role: AppRole | null, username?: string | null): boolean {
  if (role === "chemicals_editor" || role === "batch_editor") {
    return false;
  }
  if (role === "admin" || role === "po_creator") return true;
  return isDispatchTripPlanner(role, username);
}

export function canCreateDispatchTrips(role: AppRole | null, username?: string | null): boolean {
  return isDispatchTripPlanner(role, username);
}

/** Ali (trip planner) or admin — edit vehicle/driver and PO list on a dispatch trip. */
export function canEditDispatchTrip(role: AppRole | null, username?: string | null): boolean {
  return isDispatchTripPlanner(role, username);
}

/** Ali (trip planner) or admin — discard a vehicle trip before it leaves the factory. */
export function canDiscardDispatchTrip(role: AppRole | null, username?: string | null): boolean {
  return isDispatchTripPlanner(role, username);
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
  return role === "batch_editor" || role === "admin";
}

export function canEditPackagingInventory(role: AppRole | null): boolean {
  return role === "batch_editor";
}

/** Ramazan, Esha (catalog read), or Waleed admin. */
export function canViewChemicalMaterials(role: AppRole | null): boolean {
  return role === "chemicals_editor" || role === "batch_editor" || role === "admin";
}

/** Ramazan or Waleed admin — set stock on hand and add catalog materials. */
export function canEditChemicalStock(role: AppRole | null): boolean {
  return role === "chemicals_editor" || role === "admin";
}

/** Esha can maintain packing/accessory stock without opening chemical stock edits. */
export function canEditChemicalAccessoryStock(role: AppRole | null): boolean {
  return role === "batch_editor" || role === "admin";
}

/** Esha only — record QC intake on incoming chemicals. */
export function canRecordChemicalIntake(role: AppRole | null): boolean {
  return role === "batch_editor";
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

/** Nouman, Javeria, Aslam, Ahtisham & Ibtisam — edit POs before delivery. */
const PO_ORDER_EDITOR_USERNAMES = new Set(["nouman", "javeria", "aslam", "ahtisham", "ibtisam"]);

/** Nouman — read-only boss summaries (orders matrix + delivered/pending). Waleed uses admin role. */
export function isAdminSummaryViewer(role: AppRole | null, username?: string | null): boolean {
  return canViewAdminSummary(role, username) && !isAdmin(role);
}

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

/** Waleed admin and Nouman — operations reports hub. */
export function canViewAdminReports(role: AppRole | null, username?: string | null): boolean {
  if (isAdmin(role)) return true;
  return canViewAdminSummary(role, username);
}

/** Waleed admin and Nouman — packaging low-stock alerts. */
export function canViewPackagingAlerts(role: AppRole | null, username?: string | null): boolean {
  if (isAdmin(role)) return true;
  return canViewAdminSummary(role, username);
}

/** Waleed admin and Nouman — all-orders list with PO detail. */
export function canViewAdminOrdersList(role: AppRole | null, username?: string | null): boolean {
  if (isAdmin(role)) return true;
  return canViewAdminSummary(role, username);
}

/** Rashid, Waleed admin, or Nouman (read-only) — ready bottle stock. */
export function canViewDispatchReadyStock(role: AppRole | null, username?: string | null): boolean {
  if (canEditDispatch(role, username) || isAdmin(role)) return true;
  return canViewAdminSummary(role, username);
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
