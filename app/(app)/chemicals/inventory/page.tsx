import { redirect } from "next/navigation";

import { ChemicalMaterialsPortal } from "@/components/ChemicalMaterialsPortal";
import { auth } from "@/lib/auth";
import {
  canViewChemicalMaterials,
  homePathForRole,
  isAdmin,
  roleFromSession,
} from "@/lib/roles";
import { ui } from "@/lib/ui";

export default async function ChemicalInventoryPage() {
  const session = await auth();
  const role = roleFromSession(session?.user as { role?: string });
  const username = (session?.user as { username?: string })?.username;

  if (!canViewChemicalMaterials(role)) {
    redirect(role ? homePathForRole(role, username) : "/login");
  }

  const ramazan = role === "chemicals_editor";
  const admin = isAdmin(role);

  return (
    <div className="space-y-6">
      <header className={ui.pageHeader}>
        <h1 className={ui.pageTitle}>Chemical raw materials</h1>
        <p className={ui.pageDesc}>
          {ramazan
            ? "View stock on hand and request materials for re-order. Stock is updated by Esha after QC intake."
            : admin
              ? "View catalog, adjust stock when needed, and review material requests."
              : "View chemical raw materials stock (read-only)."}
        </p>
      </header>
      <ChemicalMaterialsPortal
        readOnly={!ramazan && !admin}
        stockEditable={admin}
        canRequest={ramazan}
      />
    </div>
  );
}
