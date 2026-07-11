import Link from "next/link";
import { redirect } from "next/navigation";

import { CustomerAccountsAdminTable } from "@/components/CustomerAccountsAdminTable";
import { auth } from "@/lib/auth";
import { serializeCustomerAccount } from "@/lib/customerAccount";
import { formatDisplayDate } from "@/lib/dateOnly";
import { connectToDatabase } from "@/lib/db";
import { CustomerAccount } from "@/lib/models/CustomerAccount";
import { canOpenCustomerAccounts, homePathForRole, isAdmin, roleFromSession } from "@/lib/roles";
import { ui } from "@/lib/ui";

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return formatDisplayDate(iso);
}

function openerStatusLabel(status: string): string {
  if (status === "pending") return "Pending approval";
  if (status === "blocked") return "Blocked";
  return "Approved";
}

export default async function AccountsListPage() {
  const session = await auth();
  const role = roleFromSession(session?.user as { role?: string });
  const username = (session?.user as { username?: string })?.username;

  if (!canOpenCustomerAccounts(role)) {
    redirect(role ? homePathForRole(role, username) : "/login");
  }

  await connectToDatabase();

  const admin = isAdmin(role);
  const userId = (session?.user as { id?: string })?.id ?? null;
  const filter = admin ? {} : { createdByUserId: userId };

  const docs = await CustomerAccount.find(filter).sort({ createdAt: -1 }).limit(500).lean();
  const accounts = docs.map((d) => serializeCustomerAccount(d));

  return (
    <div className="space-y-6">
      <div className={ui.pageHeader}>
        <h1 className={ui.pageTitle}>Customer accounts</h1>
        <p className={ui.pageDesc}>
          {admin
            ? "Review new accounts before they appear on orders and field visits. Blocked customers are hidden everywhere."
            : "Accounts you have opened. New accounts need admin approval before they can be used on orders."}
        </p>
      </div>

      {role === "account_opener" ? (
        <div>
          <Link href="/accounts/open" className={ui.btnPrimary}>
            Open new account
          </Link>
        </div>
      ) : null}

      {accounts.length === 0 ? (
        <div className={ui.emptyState}>No customer accounts yet.</div>
      ) : admin ? (
        <CustomerAccountsAdminTable initialAccounts={accounts} />
      ) : (
        <div className={ui.cardVisible}>
          <table className={ui.dataTable}>
            <thead>
              <tr>
                <th>Company</th>
                <th>City</th>
                <th>Contact</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a.id}>
                  <td className="font-medium text-slate-800">{a.companyName}</td>
                  <td>{a.city || "—"}</td>
                  <td>
                    <div className="space-y-2">
                      {(a.contacts.length > 0
                        ? a.contacts
                        : [
                            {
                              contactPerson: a.contactPerson,
                              designation: a.designation,
                              phone: a.phone,
                              email: a.email,
                            },
                          ]
                      ).map((contact, index) => (
                        <div key={`${a.id}-${index}`}>
                          <div>{contact.contactPerson || "—"}</div>
                          {contact.designation ? (
                            <div className="text-xs text-slate-500">{contact.designation}</div>
                          ) : null}
                          {contact.phone ? (
                            <div className="text-xs text-slate-500">{contact.phone}</div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td>{openerStatusLabel(a.approvalStatus)}</td>
                  <td>{fmtDate(a.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
