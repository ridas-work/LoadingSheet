import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { batchProgress } from "@/lib/orderBatchStatus";
import { Order } from "@/lib/models/Order";
import { pendingSampleOrdersMongoFilter } from "@/lib/sampleDispatch";
import {
  canViewRashidPoOrders,
  homePathForRole,
  isAdmin,
  roleFromSession,
} from "@/lib/roles";

export default async function SampleOrdersPage() {
  const session = await auth();
  const role = roleFromSession(session?.user as { role?: string });
  const username = (session?.user as { username?: string })?.username;

  if (!canViewRashidPoOrders(role, username) && !isAdmin(role)) {
    redirect(role ? homePathForRole(role, username) : "/login");
  }

  await connectToDatabase();
  const orders = await Order.find(pendingSampleOrdersMongoFilter())
    .sort({ createdAt: -1 })
    .select({
      poNumber: 1,
      customerName: 1,
      sampleRepName: 1,
      sheetLines: 1,
      createdAt: 1,
    })
    .lean();

  const rows = orders.map((o) => {
    const { filled, total } = batchProgress(o.sheetLines);
    return {
      id: o._id.toString(),
      poNumber: o.poNumber,
      customerName: o.customerName,
      repName: (o as { sampleRepName?: string }).sampleRepName?.trim() ?? "",
      filled,
      total,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Sample orders</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Field visit samples approved by Waleed. Assign sample production batches here — Esha&apos;s sample pool
          is deducted when every product has a batch. Orders leave this list once batch assignment is complete.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-600">
          No sample orders waiting for batch assignment. New ones appear here after Waleed approves an outgoing
          field visit sample.
        </p>
      ) : (
        <ul className="divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 bg-white">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="font-medium text-zinc-900">
                  {r.poNumber} — {r.customerName}
                </p>
                <p className="text-xs text-zinc-500">
                  {r.repName ? `Rep ${r.repName} · ` : ""}
                  {r.total > 0 ? `${r.filled}/${r.total} products assigned` : "No products"}
                </p>
              </div>
              <Link
                href={`/dispatch/sample-orders/${r.id}/loading-sheet`}
                className="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white"
              >
                Assign sample batches
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
