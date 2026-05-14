"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  batchId: string;
  batchNo: string;
  canManage: boolean;
  locked: boolean;
};

export function ProductionBatchRowActions({ batchId, batchNo, canManage, locked }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!canManage || locked) return null;

  async function onDelete() {
    if (!confirm(`Delete batch "${batchNo}"? This cannot be undone.`)) return;
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/production-batches/${batchId}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError((data as { error?: string }).error ?? "Delete failed");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <Link
          href={`/production/batches/${batchId}/edit`}
          className="rounded-lg bg-white px-2 py-1 text-xs font-medium text-zinc-900 shadow-sm ring-1 ring-zinc-200"
        >
          Edit
        </Link>
        <button
          type="button"
          onClick={onDelete}
          disabled={busy}
          className="rounded-lg bg-white px-2 py-1 text-xs font-medium text-red-700 shadow-sm ring-1 ring-red-200 disabled:opacity-50"
        >
          Delete
        </button>
      </div>
      {error ? <p className="max-w-[12rem] text-right text-[10px] text-red-700">{error}</p> : null}
    </div>
  );
}
