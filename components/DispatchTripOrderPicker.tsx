"use client";

export type PickerOrder = {
  id: string;
  poNumber: string;
  customerName: string;
  dispatchTripId: string | null;
};

type Props = {
  orders: PickerOrder[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  currentTripId?: string;
};

export function DispatchTripOrderPicker({ orders, selectedIds, onChange, currentTripId }: Props) {
  const toggle = (id: string, disabled: boolean) => {
    if (disabled) return;
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  if (orders.length === 0) {
    return (
      <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-4 text-sm text-zinc-600">
        No orders available.
      </p>
    );
  }

  return (
    <ul className="max-h-72 divide-y divide-zinc-100 overflow-y-auto rounded-lg border border-zinc-200 bg-white">
      {orders.map((o) => {
        const onOtherTrip =
          o.dispatchTripId != null && o.dispatchTripId.length > 0 && o.dispatchTripId !== currentTripId;
        const checked = selectedIds.includes(o.id);
        const disabled = onOtherTrip;

        return (
          <li key={o.id} className="flex items-start gap-3 px-3 py-2">
            <input
              type="checkbox"
              id={`trip-order-${o.id}`}
              checked={checked}
              disabled={disabled}
              onChange={() => toggle(o.id, disabled)}
              className="mt-1"
            />
            <label
              htmlFor={`trip-order-${o.id}`}
              className={`flex-1 text-sm ${disabled ? "cursor-not-allowed text-zinc-400" : "cursor-pointer"}`}
            >
              <span className="font-medium">{o.poNumber}</span>
              <span className="text-zinc-600"> — {o.customerName}</span>
              {onOtherTrip ? (
                <span className="mt-0.5 block text-xs text-amber-700">Already on another trip</span>
              ) : null}
            </label>
          </li>
        );
      })}
    </ul>
  );
}
