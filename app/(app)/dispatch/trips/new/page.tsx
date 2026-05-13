import { DispatchTripForm } from "@/components/DispatchTripForm";
import type { PickerOrder } from "@/components/DispatchTripOrderPicker";
import { connectToDatabase } from "@/lib/db";
import { Order } from "@/lib/models/Order";
import { EMPTY_DISPATCH } from "@/lib/roles";

type PageProps = {
  searchParams: Promise<{ orderIds?: string }>;
};

export default async function NewDispatchTripPage(props: PageProps) {
  const { orderIds: orderIdsParam } = await props.searchParams;
  const preselected =
    typeof orderIdsParam === "string"
      ? orderIdsParam
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

  await connectToDatabase();
  const orderDocs = await Order.find({})
    .sort({ createdAt: -1 })
    .select({ poNumber: 1, customerName: 1, dispatchTripId: 1 })
    .lean();

  const orders: PickerOrder[] = orderDocs.map((o) => ({
    id: o._id.toString(),
    poNumber: o.poNumber,
    customerName: o.customerName,
    dispatchTripId: o.dispatchTripId ? o.dispatchTripId.toString() : null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">New dispatch trip</h1>
        <p className="mt-1 text-sm text-zinc-600">Pick POs and enter vehicle details once for the whole truck.</p>
      </div>
      <DispatchTripForm
        initialOrderIds={preselected}
        orders={orders}
        initialDispatch={EMPTY_DISPATCH}
      />
    </div>
  );
}
