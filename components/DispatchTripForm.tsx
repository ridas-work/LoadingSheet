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
  vehicleOptions: string[];
  driverOptions: string[];
};

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
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
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900"
      >
        <option value="">Select…</option>
        {mergedOptions.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </label>
  );
}

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

export function DispatchTripForm({
  tripId,
  initialOrderIds,
  orders,
  initialDispatch,
  vehicleOptions,
  driverOptions,
}: Props) {
  const router = useRouter();
  const [orderIds, setOrderIds] = useState<string[]>(initialOrderIds);
  const [dispatch, setDispatch] = useState<DispatchFields>(initialDispatch);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSave = async () => {
    setSaving(true);
    setError(null);

    const body = { ...dispatch, orderIds };
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
      router.push(`/dispatch/trips/${tripId}`);
    } else {
      const data = (await res.json()) as { id?: string };
      router.push(data.id ? `/dispatch/trips/${data.id}` : "/dispatch/trips");
    }
    router.refresh();
  };

  const onDelete = async () => {
    if (!tripId) return;
    if (!window.confirm("Delete this trip? Linked orders will no longer show a vehicle trip.")) {
      return;
    }
    setSaving(true);
    const res = await fetch(`/api/dispatch-trips/${tripId}`, { method: "DELETE" });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError((data as { error?: string }).error ?? "Delete failed");
      return;
    }
    router.push("/dispatch/trips");
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
      </div>

      <div>
        <h2 className="text-lg font-semibold text-zinc-900">Vehicle &amp; dispatch</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Pick vehicle and driver from the fleet list. These fields sync to every selected PO&apos;s loading sheet.
        </p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Vehicle no"
            value={dispatch.vehicleNo}
            options={vehicleOptions}
            onChange={(v) => setDispatch((d) => ({ ...d, vehicleNo: v }))}
          />
          <SelectField
            label="Driver name"
            value={dispatch.driverName}
            options={driverOptions}
            onChange={(v) => setDispatch((d) => ({ ...d, driverName: v }))}
          />
          <Field label="DC no" value={dispatch.dcNo} onChange={(v) => setDispatch((d) => ({ ...d, dcNo: v }))} />
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
          href="/dispatch/trips"
          className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-zinc-900 shadow-sm ring-1 ring-zinc-200"
        >
          Cancel
        </Link>
        {tripId ? (
          <button
            type="button"
            onClick={onDelete}
            disabled={saving}
            className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-red-700 shadow-sm ring-1 ring-red-200"
          >
            Delete trip
          </button>
        ) : null}
      </div>
    </div>
  );
}
