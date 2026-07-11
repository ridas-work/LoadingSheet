import Link from "next/link";
import { redirect } from "next/navigation";

import { PackagingInventoryGrid } from "@/components/PackagingInventoryGrid";
import { PageHeader } from "@/components/PageHeader";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { PackagingItem } from "@/lib/models/PackagingItem";
import { serializePackagingItem } from "@/lib/packagingInventory";
import { canEditPackagingInventory, homePathForRole, isAdmin, roleFromSession } from "@/lib/roles";

export default async function PackagingInventoryPage() {
  await connectToDatabase();

  const session = await auth();
  const role = roleFromSession(session?.user as { role?: string });
  const username = (session?.user as { username?: string })?.username;
  const canEdit = canEditPackagingInventory(role);
  const readOnly = isAdmin(role);
  const isEsha = role === "batch_editor";
  if (!canEdit && !readOnly) {
    redirect(role ? homePathForRole(role, username) : "/login");
  }

  const items = await PackagingItem.find({ active: true }).sort({ sortOrder: 1, name: 1 }).lean();

  const description = canEdit
    ? "Record purchased stock, rejected/damaged units, and UIP. Balance is calculated automatically."
    : "View packaging stock (read-only).";

  return (
    <div className="space-y-6">
      {isEsha ? (
        <PageHeader
          accent="esha"
          title="Packaging inventory"
          description={description}
          backHref="/production/batches"
          backLabel="Back to batches"
          actions={
            <Link href="/dispatch/inventory/history" className="text-sm font-medium text-zinc-700 underline">
              Stock history
            </Link>
          }
        />
      ) : (
        <div>
          <Link href="/dispatch/trips" className="text-sm font-medium text-zinc-700 underline">
            ← Dispatch trips
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-zinc-900">Packaging inventory</h1>
          <p className="mt-1 text-sm text-zinc-600">{description}</p>
          {canEdit ? (
            <p className="mt-1 text-xs text-zinc-500">
              <Link href="/dispatch/inventory/history" className="underline hover:text-zinc-800">
                Stock history by date
              </Link>
            </p>
          ) : null}
        </div>
      )}

      <p className="text-xs text-zinc-700">
        <strong>Balance = Purchased − Rejected/Damage − UIP</strong> (Used in Production). You can enter UIP
        manually. Rashid&apos;s daily filling and Zaman&apos;s delivered orders can also add to UIP automatically.
      </p>

      <PackagingInventoryGrid
        items={items.map((item) => serializePackagingItem(item))}
        readOnly={readOnly}
      />
    </div>
  );
}
