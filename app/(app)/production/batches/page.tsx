import Link from "next/link";

import { connectToDatabase } from "@/lib/db";
import { Order } from "@/lib/models/Order";

export default async function ProductionBatchesPage() {
  await connectToDatabase();

  const orders = await Order.find({})
    .sort({ createdAt: -1 })
    .select("_id poNumber customerName createdAt sheetLines.batchNo")
    .lean();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Batch entry</h1>
        <p className="mt-1 text-sm text-zinc-600">Select an order to enter batch numbers for each carton.</p>
      </div>

      {orders.length === 0 ? (
        <p className="rounded-xl border border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-600">
          No orders yet. PO creators will add orders first.
        </p>
      ) : (
        <ul className="divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 bg-white">
          {orders.map((o) => {
            const lines = o.sheetLines ?? [];
            const total = lines.length;
            const filled = lines.filter((l) => typeof l.batchNo === "string" && l.batchNo.trim().length > 0).length;
            const complete = total > 0 && filled === total;

            return (
              <li key={o._id.toString()}>
                <Link
                  href={`/production/orders/${o._id.toString()}`}
                  className="flex items-center justify-between gap-4 px-4 py-3 transition hover:bg-zinc-50"
                >
                  <div>
                    <p className="font-medium text-zinc-900">{o.poNumber}</p>
                    <p className="text-sm text-zinc-600">{o.customerName}</p>
                  </div>
                  <div className="text-right text-sm">
                    <p className={complete ? "font-medium text-emerald-700" : "text-zinc-700"}>
                      {filled}/{total} batches
                    </p>
                    <p className="text-zinc-500">{new Date(o.createdAt).toLocaleDateString()}</p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
