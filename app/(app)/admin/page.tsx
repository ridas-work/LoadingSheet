import Link from "next/link";

import { AdminSummaryDashboard } from "@/components/AdminSummaryDashboard";

export default function AdminPage() {
  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-zinc-200 bg-white p-4 print:hidden">
        <h2 className="text-sm font-semibold text-zinc-900">Oversight</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Read-only access to orders, Nimra&apos;s production batches, dispatch trips, packaging inventory, and daily bottle filling records.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href="/orders"
            className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-zinc-900 shadow-sm ring-1 ring-zinc-200"
          >
            Orders — view &amp; edit POs
          </Link>
          <Link
            href="/production/batches"
            className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-zinc-900 shadow-sm ring-1 ring-zinc-200"
          >
            Production batches
          </Link>
          <Link
            href="/dispatch/trips"
            className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-zinc-900 shadow-sm ring-1 ring-zinc-200"
          >
            Dispatch trips
          </Link>
          <Link
            href="/dispatch/inventory"
            className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-zinc-900 shadow-sm ring-1 ring-zinc-200"
          >
            Packaging inventory
          </Link>
          <Link
            href="/dispatch/filling"
            className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-zinc-900 shadow-sm ring-1 ring-zinc-200"
          >
            Daily bottle filling &amp; waste
          </Link>
          <Link
            href="/admin/field-visits"
            className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-zinc-900 shadow-sm ring-1 ring-zinc-200"
          >
            Field visits (Nouman &amp; Javeria)
          </Link>
        </div>
      </div>
      <AdminSummaryDashboard />
    </div>
  );
}
