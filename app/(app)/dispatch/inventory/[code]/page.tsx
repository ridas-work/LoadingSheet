import Link from "next/link";
import { notFound } from "next/navigation";

import { PackagingCountForm } from "@/components/PackagingCountForm";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { PackagingItem } from "@/lib/models/PackagingItem";
import { PackagingStockMovement } from "@/lib/models/PackagingStockMovement";
import { canEditDispatch, isAdmin, roleFromSession } from "@/lib/roles";

type PageProps = {
  params: Promise<{ code: string }>;
};

export default async function PackagingItemPage(props: PageProps) {
  const { code: rawCode } = await props.params;
  const code = decodeURIComponent(rawCode).trim().toLowerCase();
  if (!code) notFound();

  await connectToDatabase();

  const session = await auth();
  const role = roleFromSession(session?.user as { role?: string });
  const readOnly = isAdmin(role) || !canEditDispatch(role);

  const item = await PackagingItem.findOne({ code, active: true }).lean();
  if (!item) notFound();

  const movements = await PackagingStockMovement.find({ itemCode: code })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <Link href="/dispatch/inventory" className="text-sm font-medium text-zinc-700 underline">
          ← Packaging inventory
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-zinc-900">{item.name}</h1>
        <p className="mt-1 text-sm text-zinc-600 capitalize">{item.category}</p>
      </div>

      <PackagingCountForm
        code={item.code}
        name={item.name}
        unit={item.unit ?? "pcs"}
        initialOnHand={item.onHand ?? 0}
        readOnly={readOnly}
        initialMovements={movements.map((m) => ({
          id: m._id.toString(),
          quantityDelta: m.quantityDelta,
          quantityAfter: m.quantityAfter,
          reason: m.reason ?? "count",
          note: m.note ?? "",
          recordedByName: m.recordedByName ?? "",
          createdAt: m.createdAt?.toISOString() ?? "",
        }))}
      />
    </div>
  );
}
