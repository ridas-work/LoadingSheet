"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export type SampleAssignLine = {
  boxNo: number;
  productName: string;
  bottlesPerBox: number;
  batchNo: string;
  options: Array<{ batchNo: string; remainingLiters: number }>;
};

type Props = {
  orderId: string;
  poNumber: string;
  customerName: string;
  repName: string;
  alreadyDeducted: boolean;
  lines: SampleAssignLine[];
};

export function SampleBatchAssignmentSheet({
  orderId,
  poNumber,
  customerName,
  repName,
  alreadyDeducted,
  lines,
}: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [batches, setBatches] = useState<Record<number, string>>(() => {
    const initial: Record<number, string> = {};
    for (const line of lines) initial[line.boxNo] = line.batchNo?.trim() ?? "";
    return initial;
  });

  const progress = useMemo(() => {
    const total = lines.length;
    const complete = lines.filter((l) => (batches[l.boxNo] ?? "").trim()).length;
    return { total, complete, fullyAssigned: total > 0 && complete === total };
  }, [batches, lines]);

  const save = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);

    const assignments = lines.map((line) => ({
      boxNo: line.boxNo,
      batchNo: batches[line.boxNo]?.trim() ?? "",
    }));

    const res = await fetch(`/api/orders/${orderId}/sample-batch-assignments`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignments }),
    });
    setSaving(false);

    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      deducted?: boolean;
      fullyAssigned?: boolean;
    };

    if (!res.ok) {
      setError(data.error ?? "Could not save sample batches.");
      return;
    }

    if (data.deducted) {
      router.push("/dispatch/sample-orders");
      return;
    }

    setMessage("Saved. Assign a batch to every product to finish and deduct the sample pool.");
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/dispatch/sample-orders" className="text-sm font-medium text-zinc-700 underline">
          ← Back to sample orders
        </Link>
        <button
          type="button"
          onClick={save}
          disabled={saving || alreadyDeducted}
          className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save sample batches"}
        </button>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
        Assign a sample production batch to every product. Esha&apos;s sample pool is deducted only once every
        line has a batch. Batch options come from sample production only.
      </div>
      {alreadyDeducted ? (
        <p className="text-sm text-emerald-700">
          Sample stock already deducted for this order — re-saving will not deduct again.
        </p>
      ) : null}
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="whitespace-pre-line text-sm text-red-700">{error}</p> : null}

      <div className="rounded-xl border border-zinc-900 bg-white p-4 text-black shadow-sm">
        <div className="mb-4">
          <h1 className="text-center text-lg font-semibold uppercase tracking-wide">
            Sample dispatch batch assignment
          </h1>
          <p className="mt-1 text-center text-xs text-zinc-600">
            {poNumber} · {customerName}
            {repName ? ` · Rep ${repName}` : ""} · {progress.complete}/{progress.total} products assigned
          </p>
        </div>

        <table className="w-full border-collapse border border-black text-sm">
          <thead>
            <tr className="bg-zinc-100">
              <th className="border border-black px-2 py-2 font-semibold">#</th>
              <th className="border border-black px-2 py-2 font-semibold">Product</th>
              <th className="border border-black px-2 py-2 font-semibold">Bottles</th>
              <th className="border border-black px-2 py-2 font-semibold">Sample batch</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr key={line.boxNo}>
                <td className="border border-black px-2 py-1 text-center">{line.boxNo}</td>
                <td className="border border-black px-2 py-1">{line.productName}</td>
                <td className="border border-black px-2 py-1 text-center">{line.bottlesPerBox}</td>
                <td className="border border-black px-2 py-1 text-center">
                  <select
                    value={batches[line.boxNo] ?? ""}
                    onChange={(e) =>
                      setBatches((prev) => ({ ...prev, [line.boxNo]: e.target.value }))
                    }
                    disabled={alreadyDeducted}
                    className="w-full min-w-[10rem] rounded border border-zinc-300 px-1 py-0.5 text-center text-sm disabled:bg-zinc-100"
                  >
                    <option value="">— assign sample batch</option>
                    {line.options.map((option) => (
                      <option key={option.batchNo} value={option.batchNo}>
                        {option.batchNo} ({option.remainingLiters} L left)
                      </option>
                    ))}
                  </select>
                  {line.options.length === 0 ? (
                    <p className="mt-1 text-[11px] text-red-600">No sample batch available for this product.</p>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
