import Link from "next/link";
import { redirect } from "next/navigation";

import { PackagingInventoryGrid } from "@/components/PackagingInventoryGrid";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { PackagingItem } from "@/lib/models/PackagingItem";
import { serializePackagingItem } from "@/lib/packagingInventory";
import { canEditPackagingInventory, homePathForRole, isAdmin, roleFromSession } from "@/lib/roles";

export default async function PackagingInventoryPage() {
  await connectToDatabase();

  const session = await auth();
  const role = roleFromSession(session?.user as { role?: string });
  const canEdit = canEditPackagingInventory(role);
  const readOnly = isAdmin(role);
  if (!canEdit && !readOnly) {
    redirect(role ? homePathForRole(role) : "/login");
  }

  const items = await PackagingItem.find({ active: true }).sort({ sortOrder: 1, name: 1 }).lean();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dispatch/trips" className="text-sm font-medium text-zinc-700 underline">
          ← Dispatch trips
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">Packaging inventory</h1>
        <p className="mt-1 text-sm text-zinc-600">
          {canEdit
            ? "Haider records purchased stock, rejected/damaged units, and UIP. Balance is calculated automatically."
            : "View packaging stock (read-only)."}
        </p>
        <p className="mt-2 text-xs text-zinc-700">
          <strong>Balance = Purchased − Rejected/Damage − UIP</strong> (Used in Production). You can enter UIP
          manually. Rashid&apos;s daily filling and Zaman&apos;s delivered orders can also add to UIP automatically.
        </p>
        {canEdit ? (
          <p className="mt-1 text-xs text-zinc-500">
            <Link href="/dispatch/inventory/movements" className="underline hover:text-zinc-800">
              Recent stock movements
            </Link>
          </p>
        ) : null}
      </div>

      <PackagingInventoryGrid
        items={items.map((item) => serializePackagingItem(item))}
        readOnly={readOnly}
      />
    </div>
  );
}
