import { GateOrdersTable } from "@/components/GateOrdersTable";

export default function GateOrdersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Gate orders</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Only orders that are <strong>ready to leave</strong> are listed (on a dispatch trip with vehicle, driver,
          and DC filled). When a vehicle leaves, mark <strong>Out for delivery</strong>. When the customer has
          received the goods, mark <strong>Delivered</strong>; this automatically deducts mapped packaging stock.
          If goods return on the vehicle, mark <strong>Pending redelivery</strong> for a later trip.
        </p>
      </div>
      <GateOrdersTable />
    </div>
  );
}
