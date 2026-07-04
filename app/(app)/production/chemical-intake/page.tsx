import Link from "next/link";
import { redirect } from "next/navigation";

import { AccessoryStockCard } from "@/components/ChemicalIntakeForm";
import { ChemicalIntakePanel } from "@/components/ChemicalIntakePanel";
import { auth } from "@/lib/auth";
import { canRecordChemicalIntake, homePathForRole, roleFromSession } from "@/lib/roles";
import { ui } from "@/lib/ui";

export default async function ChemicalIntakePage() {
  const session = await auth();
  const role = roleFromSession(session?.user as { role?: string });
  const username = (session?.user as { username?: string })?.username;

  if (!canRecordChemicalIntake(role)) {
    redirect(role ? homePathForRole(role, username) : "/login");
  }

  return (
    <div className="space-y-6">
      <header className={ui.pageHeader}>
        <Link href="/production/batches" className="text-sm font-medium text-zinc-700 underline">
          ← Back to batches
        </Link>
        <h1 className={ui.pageTitle}>Chemical intake & QC</h1>
        <p className={ui.pageDesc}>
          Record incoming chemicals after QC. Successful intake adds stock to Ramazan&apos;s portal.
          New chemical names are added to the catalog automatically.
        </p>
      </header>

      <AccessoryStockCard />
      <ChemicalIntakePanel />
    </div>
  );
}
