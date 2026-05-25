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
            ? "Haider maintains packaging stock here. Type quantities in the table below; each row saves when you leave it."
            : "View packaging stock (read-only)."}
        </p>
        <p className="mt-2 text-xs text-amber-800">
          Delivered orders automatically deduct mapped bottles, caps, stickers, labels, and cartons.
        </p>
      </div>

      <PackagingInventoryGrid
        items={items.map((item) => serializePackagingItem(item))}
        readOnly={readOnly}
      />
    </div>
  );
}
