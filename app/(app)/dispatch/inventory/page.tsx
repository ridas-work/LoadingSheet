import Link from "next/link";

import { PackagingInventoryGrid } from "@/components/PackagingInventoryGrid";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { PackagingItem } from "@/lib/models/PackagingItem";
import { serializePackagingItem } from "@/lib/packagingInventory";
import { canEditDispatch, isAdmin, roleFromSession } from "@/lib/roles";

export default async function PackagingInventoryPage() {
  await connectToDatabase();

  const session = await auth();
  const role = roleFromSession(session?.user as { role?: string });
  const canEdit = canEditDispatch(role);
  const readOnly = isAdmin(role);

  const items = await PackagingItem.find({ active: true }).sort({ category: 1, name: 1 }).lean();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dispatch/trips" className="text-sm font-medium text-zinc-700 underline">
          ← Dispatch trips
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">Packaging inventory</h1>
        <p className="mt-1 text-sm text-zinc-600">
          {canEdit
            ? "Record how many empty bottles, caps, stickers, and labels you have on hand. Updates are logged for audit."
            : "View packaging stock levels (read-only)."}
        </p>
        <p className="mt-2 text-xs text-amber-800">
          Coming later: counts will reduce automatically when bottles are filled or orders ship.
        </p>
      </div>

      <PackagingInventoryGrid
        items={items.map((item) => serializePackagingItem(item))}
        readOnly={readOnly}
      />
    </div>
  );
}
