import Link from "next/link";
import { redirect } from "next/navigation";

import { ReadyBottleStockPanel } from "@/components/ReadyBottleStockPanel";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { ProductionBatch } from "@/lib/models/ProductionBatch";
import { ProductPacking } from "@/lib/models/ProductPacking";
import { canViewDispatchReadyStock, homePathForRole, isAdmin, isAdminSummaryViewer, roleFromSession } from "@/lib/roles";

export default async function ReadyStockPage() {
  const session = await auth();
  const role = roleFromSession(session?.user as { role?: string });
  const username = (session?.user as { username?: string })?.username;

  if (!canViewDispatchReadyStock(role, username)) {
    redirect(role ? homePathForRole(role, username) : "/login");
  }

  const readOnly = isAdmin(role) || isAdminSummaryViewer(role, username);

  await connectToDatabase();

  const [batches, catalogDocs] = await Promise.all([
    ProductionBatch.find({})
      .select({ batchNo: 1, productName: 1 })
      .sort({ preparedAt: -1 })
      .lean(),
    ProductPacking.find({ active: true }).select({ code: 1, name: 1, bundleComponents: 1 }).lean(),
  ]);

  const nameByCode = new Map(catalogDocs.map((p) => [p.code.trim().toLowerCase(), p.name]));
  const catalogOptions = catalogDocs.map((p) => ({
    code: p.code,
    name: p.name,
    bundleComponents: (p.bundleComponents ?? []).map((c) => ({
      code: c.code,
      name: nameByCode.get(c.code.trim().toLowerCase()) ?? c.code,
      bottlesPerUnit: c.bottlesPerUnit,
    })),
  }));
  const batchOptions = batches.map((b) => ({ batchNo: b.batchNo, productName: b.productName }));

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dispatch/trips" className="text-sm font-medium text-zinc-700 underline">
          ← Dispatch trips
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">Ready stock</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Pre-filled bottles on the production floor, tracked by batch label and product.
        </p>
      </div>

      <ReadyBottleStockPanel
        readOnly={readOnly}
        catalog={catalogOptions}
        batchOptions={batchOptions}
        hideTitle
      />
    </div>
  );
}
