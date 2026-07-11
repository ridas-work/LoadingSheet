import { GateOrdersTable } from "@/components/GateOrdersTable";

export default function GateOrdersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Gate orders</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Only orders that are <strong>ready to leave</strong> are listed (on a dispatch trip with vehicle, driver,
          and DC filled). When a vehicle leaves, mark <strong>Out for delivery</strong>. When the customer has
          received the goods, use <strong>Close delivery</strong> — choose full or partial; good returned bottles go
          back to Rashid&apos;s stock and damaged bottles are written off. On already-delivered POs, use{' '}
          <strong>Late return</strong> for bottles that come back weeks or months later (no limit on quantity).
        </p>
      </div>
      <GateOrdersTable />
    </div>
  );
}
