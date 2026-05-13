import Link from "next/link";

import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { Order } from "@/lib/models/Order";
import { roleFromSession } from "@/lib/roles";

export default async function OrdersPage() {
  await connectToDatabase();

  const session = await auth();
  const role = roleFromSession(session?.user as { role?: string });
  const isBatchEditor = role === "batch_editor";

  const orders = await Order.find({})
    .sort({ createdAt: -1 })
    .select("_id poNumber customerName createdAt sheetLines.batchNo")
    .lean();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Orders</h1>
        <p className="mt-1 text-sm text-zinc-600">Open the loading sheet for any order.</p>
      </div>

      {orders.length === 0 ? (
        <p className="rounded-xl border border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-600">
          No orders yet.
        </p>
      ) : (
        <ul className="divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 bg-white">
          {orders.map((o) => {
            const id = o._id.toString();
            const lines = o.sheetLines ?? [];
            const total = lines.length;
            const filled = lines.filter((l) => typeof l.batchNo === "string" && l.batchNo.trim().length > 0).length;

            return (
              <li key={id} className="px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-zinc-900">{o.poNumber}</p>
                    <p className="text-sm text-zinc-600">{o.customerName}</p>
                    <p className="text-xs text-zinc-500">
                      {new Date(o.createdAt).toLocaleDateString()} · {filled}/{total} batches
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/orders/${id}/loading-sheet`}
                      className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white"
                    >
                      View loading sheet
                    </Link>
                    {isBatchEditor ? (
                      <Link
                        href={`/orders/${id}/loading-sheet?edit=1`}
                        className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-zinc-900 shadow-sm ring-1 ring-zinc-200"
                      >
                        Edit batches
                      </Link>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
