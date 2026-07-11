"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import {
  DispatchTripOrderPicker,
  type PickerOrder,
} from "@/components/DispatchTripOrderPicker";
import { type DispatchFields } from "@/lib/roles";

type Props = {
  tripId?: string;
  initialOrderIds: string[];
  orders: PickerOrder[];
  initialDispatch: DispatchFields;
  initialOrderChallans?: Array<{ orderId: string; dcNo: string }>;
  vehicleOptions: string[];
  driverOptions: string[];
  /** "regular" (default) or "sample" — keeps sample dispatch separate from PO trips. */
  tripKind?: "regular" | "sample";
  /** Base route for redirects and links, e.g. "/dispatch/trips" or "/dispatch/sample-trips". */
  basePath?: string;
};

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block text-sm">
      <span className="font-medium text-zinc-700">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900"
      />
    </label>
  );
}

/** Dropdown of existing options that also allows typing a brand-new value. */
function ComboField({
  label,
  value,
  options,
  onChange,
  placeholder,
  listId,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  placeholder?: string;
  listId: string;
}) {
  const mergedOptions = useMemo(() => {
    const set = new Set(options);
    const trimmed = value.trim();
    if (trimmed) set.add(trimmed);
    return [...set].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  }, [options, value]);

  return (
    <label className="block text-sm">
      <span className="font-medium text-zinc-700">{label}</span>
      <input
        type="text"
        list={listId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900"
      />
      <datalist id={listId}>
        {mergedOptions.map((opt) => (
          <option key={opt} value={opt} />
        ))}
      </datalist>
    </label>
  );
}

export function DispatchTripForm({
  tripId,
  initialOrderIds,
  orders,
  initialDispatch,
  initialOrderChallans = [],
  vehicleOptions,
  driverOptions,
  tripKind = "regular",
  basePath = "/dispatch/trips",
}: Props) {
  const router = useRouter();
  const [orderIds, setOrderIds] = useState<string[]>(initialOrderIds);
  const [dispatch, setDispatch] = useState<DispatchFields>(initialDispatch);
  const [challans, setChallans] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const order of orders) {
      if (order.dcNo?.trim()) initial[order.id] = order.dcNo.trim();
    }
    for (const row of initialOrderChallans) {
      initial[row.orderId] = row.dcNo;
    }
    return initial;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const orderById = useMemo(() => new Map(orders.map((order) => [order.id, order])), [orders]);
  const selectedOrders = useMemo(
    () => orderIds.map((id) => orderById.get(id)).filter((order): order is PickerOrder => Boolean(order)),
    [orderById, orderIds],
  );

  const onSave = async () => {
    setSaving(true);
    setError(null);

    const body = {
      ...dispatch,
      tripKind,
      orderIds,
      orderChallans: orderIds.map((orderId) => ({
        orderId,
        dcNo: challans[orderId]?.trim() || dispatch.dcNo.trim(),
      })),
    };
    const url = tripId ? `/api/dispatch-trips/${tripId}` : "/api/dispatch-trips";
    const method = tripId ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError((data as { error?: string }).error ?? "Save failed");
      return;
    }

    if (tripId) {
      router.push(`${basePath}/${tripId}`);
    } else {
      const data = (await res.json()) as { id?: string };
      router.push(data.id ? `${basePath}/${data.id}` : basePath);
    }
    router.refresh();
  };

  const onDiscard = async () => {
    if (!tripId) return;
    if (
      !window.confirm(
        "Discard this trip? Linked POs will return to available trip planning and no longer show this vehicle trip.",
      )
    ) {
      return;
    }
    setSaving(true);
    const res = await fetch(`/api/dispatch-trips/${tripId}`, { method: "DELETE" });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError((data as { error?: string }).error ?? "Discard failed");
      return;
    }
    router.push(basePath);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900">Orders on this vehicle</h2>
        <p className="mt-1 text-sm text-zinc-600">Select one or more POs for the same truck.</p>
        <div className="mt-3">
          <DispatchTripOrderPicker
            orders={orders}
            selectedIds={orderIds}
            onChange={setOrderIds}
            currentTripId={tripId}
          />
        </div>
        {selectedOrders.length > 0 ? (
          <div className="mt-4 rounded-lg border border-zinc-200 bg-white p-3">
            <h3 className="text-sm font-semibold text-zinc-900">Challan / DC number for each PO</h3>
            <p className="mt-1 text-xs text-zinc-500">
              These numbers print separately on the combined vehicle loading sheet.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {selectedOrders.map((order) => (
                <label key={order.id} className="block text-sm">
                  <span className="font-medium text-zinc-700">
                    {order.poNumber} — {order.customerName}
                  </span>
                  <input
                    type="text"
                    value={challans[order.id] ?? ""}
                    onChange={(e) =>
                      setChallans((prev) => ({
                        ...prev,
                        [order.id]: e.target.value,
                      }))
                    }
                    placeholder={dispatch.dcNo || "Challan / DC no"}
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900"
                  />
                </label>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div>
        <h2 className="text-lg font-semibold text-zinc-900">Vehicle &amp; dispatch</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Pick vehicle and driver from the fleet list. These fields sync to every selected PO&apos;s loading sheet.
        </p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <ComboField
            label="Vehicle no"
            value={dispatch.vehicleNo}
            options={vehicleOptions}
            onChange={(v) => setDispatch((d) => ({ ...d, vehicleNo: v }))}
            placeholder="Pick a vehicle or type a new plate"
            listId="dispatch-vehicle-options"
          />
          <ComboField
            label="Driver name"
            value={dispatch.driverName}
            options={driverOptions}
            onChange={(v) => setDispatch((d) => ({ ...d, driverName: v }))}
            placeholder="Pick a driver or type a new name"
            listId="dispatch-driver-options"
          />
          <Field
            label="Default challan / DC no"
            value={dispatch.dcNo}
            onChange={(v) => setDispatch((d) => ({ ...d, dcNo: v }))}
          />
          <Field
            label="Helper name"
            value={dispatch.helperName}
            onChange={(v) => setDispatch((d) => ({ ...d, helperName: v }))}
          />
          <Field
            label="Production incharge"
            value={dispatch.productionIncharge}
            onChange={(v) => setDispatch((d) => ({ ...d, productionIncharge: v }))}
          />
          <Field
            label="Security"
            value={dispatch.securityName}
            onChange={(v) => setDispatch((d) => ({ ...d, securityName: v }))}
          />
          <Field
            label="Driver signature"
            value={dispatch.driverSignature}
            onChange={(v) => setDispatch((d) => ({ ...d, driverSignature: v }))}
          />
        </div>
      </div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onSave}
          disabled={saving || orderIds.length === 0}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {saving ? "Saving…" : tripId ? "Save trip" : "Create trip"}
        </button>
        <Link
          href={basePath}
          className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-zinc-900 shadow-sm ring-1 ring-zinc-200"
        >
          Cancel
        </Link>
        {tripId ? (
          <button
            type="button"
            onClick={onDiscard}
            disabled={saving}
            className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-red-700 shadow-sm ring-1 ring-red-200"
          >
            Discard trip
          </button>
        ) : null}
      </div>
    </div>
  );
}
