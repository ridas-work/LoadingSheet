import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { PackagingStockMovement } from "@/lib/models/PackagingStockMovement";
import { canViewPackagingInventory, homePathForRole, roleFromSession } from "@/lib/roles";

export default async function PackagingMovementsPage() {
  const session = await auth();
  const role = roleFromSession(session?.user as { role?: string });
  if (!canViewPackagingInventory(role)) {
    redirect(role ? homePathForRole(role) : "/login");
  }

  await connectToDatabase();
  const movements = await PackagingStockMovement.find({})
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dispatch/inventory" className="text-sm font-medium text-zinc-700 underline">
          ← Packaging inventory
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">Recent stock movements</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Audit trail for purchased adjustments, filling (Rashid), and delivered orders (Zaman).
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <table className="w-full min-w-[40rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs text-zinc-600">
              <th className="px-3 py-2 font-semibold">When</th>
              <th className="px-3 py-2 font-semibold">Item</th>
              <th className="px-3 py-2 text-right font-semibold">Δ Balance</th>
              <th className="px-3 py-2 text-right font-semibold">Balance after</th>
              <th className="px-3 py-2 font-semibold">Reason</th>
              <th className="px-3 py-2 font-semibold">By</th>
            </tr>
          </thead>
          <tbody>
            {movements.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-zinc-500">
                  No movements yet.
                </td>
              </tr>
            ) : (
              movements.map((m) => (
                <tr key={m._id.toString()} className="border-b border-zinc-100">
                  <td className="px-3 py-2 text-zinc-600">
                    {m.createdAt ? new Date(m.createdAt).toLocaleString() : "—"}
                  </td>
                  <td className="px-3 py-2 font-medium text-zinc-900">{m.itemCode}</td>
                  <td
                    className={`px-3 py-2 text-right tabular-nums ${
                      m.quantityDelta < 0 ? "text-red-700" : "text-emerald-700"
                    }`}
                  >
                    {m.quantityDelta >= 0 ? "+" : ""}
                    {m.quantityDelta}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{m.quantityAfter}</td>
                  <td className="px-3 py-2 text-zinc-700">{m.reason}</td>
                  <td className="px-3 py-2 text-zinc-600">{m.recordedByName || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
