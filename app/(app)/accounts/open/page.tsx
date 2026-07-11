import { redirect } from "next/navigation";

import { CustomerAccountForm } from "@/components/CustomerAccountForm";
import { auth } from "@/lib/auth";
import { canOpenCustomerAccounts, homePathForRole, roleFromSession } from "@/lib/roles";
import { ui } from "@/lib/ui";

export default async function OpenAccountPage() {
  const session = await auth();
  const role = roleFromSession(session?.user as { role?: string });
  const username = (session?.user as { username?: string })?.username;

  if (!canOpenCustomerAccounts(role)) {
    redirect(role ? homePathForRole(role, username) : "/login");
  }

  return (
    <div className="space-y-6">
      <div className={ui.pageHeader}>
        <h1 className={ui.pageTitle}>Open customer account</h1>
        <p className={ui.pageDesc}>
          Register a new customer. Once saved, the company appears automatically in the customer
          dropdowns for purchase orders and field visits.
        </p>
      </div>
      <CustomerAccountForm />
    </div>
  );
}
