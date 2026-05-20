import { GateOrdersTable } from "@/components/GateOrdersTable";

export default function GateOrdersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Gate orders</h1>
        <p className="mt-1 text-sm text-zinc-600">
          When a vehicle leaves, mark each order <strong>Out for delivery</strong>. When the customer
          receives goods, mark <strong>Delivered</strong>. If goods return on the vehicle, mark{" "}
          <strong>Pending redelivery</strong> for a later trip.
        </p>
      </div>
      <GateOrdersTable />
    </div>
  );
}
