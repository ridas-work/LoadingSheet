import { redirect } from "next/navigation";

import { ChemicalIntakeHistory } from "@/components/ChemicalIntakeForm";
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
            ? "Add materials to the catalog, update stock quantities, and request re-orders when needed."
            : admin
              ? "View catalog, adjust stock when needed, and review material requests."
              : "View chemical raw materials stock (read-only)."}
        </p>
      </header>
      <ChemicalMaterialsPortal
        readOnly={!ramazan && !admin}
        stockEditable={ramazan || admin}
        canRequest={ramazan}
        canAddMaterial={ramazan || admin}
      />
      {ramazan ? (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-900">Recent intakes</h2>
          <ChemicalIntakeHistory />
        </div>
      ) : null}
    </div>
  );
}
