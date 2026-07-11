import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { ReadyBottleMovement } from "@/lib/models/ReadyBottleMovement";
import { canViewDispatchReadyStock, homePathForRole, isAdmin, isAdminSummaryViewer, roleFromSession } from "@/lib/roles";

export default async function ReadyStockMovementsPage() {
  const session = await auth();
  const role = roleFromSession(session?.user as { role?: string });
  const username = (session?.user as { username?: string })?.username;
  if (!canViewDispatchReadyStock(role, username)) {
    redirect(role ? homePathForRole(role, username) : "/login");
  }

  await connectToDatabase();
  const rows = await ReadyBottleMovement.find({}).sort({ createdAt: -1 }).limit(100).lean();

  return (
    <div className="space-y-4">
      <Link href="/dispatch/filling" className="text-sm font-medium text-zinc-700 underline">
        ← Daily filling
      </Link>
      <h1 className="text-2xl font-semibold text-zinc-900">Ready bottle movements</h1>
      <p className="text-sm text-zinc-600">Audit log for production-floor ready stock (Rashid + Zaman delivered).</p>

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <table className="w-full min-w-[40rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs text-zinc-600">
              <th className="px-3 py-2">When</th>
              <th className="px-3 py-2">Product</th>
              <th className="px-3 py-2 text-right">Delta</th>
              <th className="px-3 py-2 text-right">After</th>
              <th className="px-3 py-2">Reason</th>
              <th className="px-3 py-2">Batch / PO</th>
              <th className="px-3 py-2">By</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m._id.toString()} className="border-b border-zinc-100">
                <td className="px-3 py-2 text-xs text-zinc-600">
                  {m.createdAt ? new Date(m.createdAt).toLocaleString() : "—"}
                </td>
                <td className="px-3 py-2">{m.productName}</td>
                <td className="px-3 py-2 text-right tabular-nums font-medium">
                  {m.delta > 0 ? `+${m.delta}` : m.delta}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{m.onHandAfter}</td>
                <td className="px-3 py-2 text-xs">{m.reason}</td>
                <td className="px-3 py-2 text-xs text-zinc-600">
                  {m.batchNo ? (
                    <>
                      Batch {m.batchNo}
                      {/not in nimra|not in qc|legacy batch/i.test(m.note ?? "") ? " (legacy)" : ""}
                    </>
                  ) : null}
                  {m.batchNo && m.poNumber ? " · " : null}
                  {m.poNumber ? `PO ${m.poNumber}` : null}
                  {!m.batchNo && !m.poNumber ? "—" : null}
                </td>
                <td className="px-3 py-2 text-xs">{m.recordedByName || "—"}</td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-zinc-500">
                  No movements yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
