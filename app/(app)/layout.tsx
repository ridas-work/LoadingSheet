import Link from "next/link";
import { redirect } from "next/navigation";

import { AppNavLink } from "@/components/AppNavLink";
import { auth } from "@/lib/auth";
import {
  canAccessFieldVisits,
  canViewAdminSummary,
  canViewOrdersList,
  homePathForRole,
  isAdmin,
  isDispatchBatchOperator,
  isDispatchTripPlanner,
  roleFromSession,
} from "@/lib/roles";
import { ui } from "@/lib/ui";

import { LogoutButton } from "./logout-button";

function mainWidthClass(
  wideLayout: boolean,
  role: ReturnType<typeof roleFromSession>,
): string {
  if (wideLayout) return "max-w-[1600px]";
  if (role === "gate_guard") return "max-w-5xl";
  return "max-w-4xl";
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const role = roleFromSession(session.user as { role?: string });
  const username = (session.user as { username?: string })?.username;
  const homeHref = role ? homePathForRole(role, username) : "/new-order";
  const admin = isAdmin(role);
  const summaryViewer = canViewAdminSummary(role, username);
  const fieldVisits = canAccessFieldVisits(role, username);
  const tripPlanner = isDispatchTripPlanner(role, username);
  const batchOperator = isDispatchBatchOperator(role, username);
  const wideLayout =
    admin ||
    summaryViewer ||
    role === "batch_editor" ||
    role === "dispatch_editor" ||
    role === "chemicals_editor";
  const widthClass = mainWidthClass(wideLayout, role);

  return (
    <div className={ui.shell}>
      <header className={ui.header}>
        <div className={`${ui.headerInner} ${widthClass}`}>
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
            <Link href={homeHref} className={ui.brand}>
              <span className={ui.brandMark}>LS</span>
              <span>Loading Sheet</span>
            </Link>
            <nav className={ui.nav} aria-label="Main">
              {admin ? (
                <>
                  <AppNavLink href="/admin" label="Summary" />
                  <AppNavLink href="/admin/approvals" label="Sample approvals" />
                  <AppNavLink href="/admin/delivery-summary" label="Delivered" />
                  <AppNavLink href="/admin/reports" label="Reports" />
                  <AppNavLink href="/admin/print-log" label="Print log" />
                  <AppNavLink href="/admin/packaging-alerts" label="Packaging alerts" />
                  <AppNavLink href="/admin/chemical-requests" label="Chemical requests" />
                  <AppNavLink href="/admin/orders" label="Orders" />
                  <AppNavLink href="/production/batches" label="Batches" />
                  <AppNavLink href="/dispatch/filling" label="Filling" />
                  <AppNavLink href="/dispatch/ready-stock" label="Ready stock" />
                  <AppNavLink href="/admin/field-visits" label="Field visits" />
                  <AppNavLink href="/admin/market-visit-alerts" label="Market alerts" />
                  <AppNavLink href="/accounts" label="Customer accounts" />
                  <AppNavLink href="/admin/rashid-daily-plan" label="Rashid plan" />
                  <AppNavLink href="https://fleet.waleedtech.com.pk/" label="Fleet" external />
                  <AppNavLink href="https://work.waleedtech.com.pk/" label="QC Logs" external />
                  <AppNavLink href="https://rnt.waleedtech.com.pk/login" label="RNT" external />
                </>
              ) : null}
              {role === "gate_guard" ? <AppNavLink href="/gate/orders" label="Gate orders" /> : null}
              {summaryViewer && !admin ? (
                <>
                  <AppNavLink href="/admin" label="Summary" />
                  <AppNavLink href="/admin/delivery-summary" label="Delivered" />
                  <AppNavLink href="/admin/reports" label="Reports" />
                  <AppNavLink href="/admin/packaging-alerts" label="Packaging alerts" />
                  <AppNavLink href="/admin/orders" label="Orders" />
                  <AppNavLink href="/dispatch/ready-stock" label="Ready stock" />
                  <AppNavLink href="https://fleet.waleedtech.com.pk/" label="Fleet" external />
                </>
              ) : null}
              {canViewOrdersList(role, username) && !admin && !summaryViewer ? (
                <AppNavLink href="/orders" label="Orders" />
              ) : null}
              {role === "batch_editor" ? (
                <>
                  <AppNavLink href="/production/batches" label="Batches" />
                  <AppNavLink href="/production/chemical-intake" label="Chemical intake" />
                  <AppNavLink href="/dispatch/inventory" label="Packaging inventory" />
                </>
              ) : null}
              {role === "dispatch_editor" && tripPlanner ? (
                <>
                  <AppNavLink href="/dispatch/trips" label="Dispatch trips" />
                  <AppNavLink href="/dispatch/sample-trips" label="Sample trips" />
                </>
              ) : null}
              {role === "dispatch_editor" && batchOperator ? (
                <>
                  <AppNavLink href="/dispatch/trips" label="Trips & batches" />
                  <AppNavLink href="/dispatch/sample-orders" label="Sample orders" />
                  <AppNavLink href="/dispatch/po-orders" label="Pending POs" />
                  <AppNavLink href="/dispatch/daily-plan" label="Daily plan" />
                  <AppNavLink href="/dispatch/filling" label="Daily filling" />
                  <AppNavLink href="/dispatch/ready-stock" label="Ready stock" />
                </>
              ) : null}
              {role === "chemicals_editor" ? (
                <AppNavLink href="/chemicals/inventory" label="Chemical materials" />
              ) : null}
              {role === "account_opener" ? (
                <>
                  <AppNavLink href="/accounts/open" label="Open account" />
                  <AppNavLink href="/accounts" label="Accounts" />
                </>
              ) : null}
              {role === "po_creator" ? <AppNavLink href="/new-order" label="New order" /> : null}
              {fieldVisits && !admin ? (
                <AppNavLink href="/field-visits" label="Field visits" />
              ) : null}
            </nav>
          </div>
          <div className={ui.userChip}>
            <span className={ui.userName}>{session.user.name}</span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className={`${ui.main} ${widthClass}`}>{children}</main>
    </div>
  );
}
