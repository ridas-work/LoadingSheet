"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

import { PrintSheetButton } from "@/components/PrintSheetButton";

export type LoadingSheetLine = {
  boxNo: number;
  productName: string;
  bottlesPerBox: number;
  batchNo: string;
  weight: number | null;
};

type Props = {
  orderId: string;
  poNumber: string;
  customerName: string;
  createdDate: string;
  sheetLines: LoadingSheetLine[];
  canEditBatches: boolean;
  initialEditMode: boolean;
  backHref: string;
};

export function LoadingSheetBatchEditor({
  orderId,
  poNumber,
  customerName,
  createdDate,
  sheetLines,
  canEditBatches,
  initialEditMode,
  backHref,
}: Props) {
  const router = useRouter();
  const [editMode, setEditMode] = useState(initialEditMode);
  const [batches, setBatches] = useState<Record<number, string>>(() => {
    const initial: Record<number, string> = {};
    for (const line of sheetLines) {
      initial[line.boxNo] = line.batchNo ?? "";
    }
    return initial;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const sheetUrl = `/orders/${orderId}/loading-sheet`;
  const editUrl = `${sheetUrl}?edit=1`;

  const onSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    setSaved(false);

    const payload = {
      batches: sheetLines.map((line) => ({
        boxNo: line.boxNo,
        batchNo: batches[line.boxNo] ?? "",
      })),
    };

    const res = await fetch(`/api/orders/${orderId}/batches`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError((data as { error?: string }).error ?? "Save failed");
      return;
    }

    setSaved(true);
    setEditMode(false);
    router.replace(sheetUrl);
  }, [batches, orderId, router, sheetLines, sheetUrl]);

  const cartonLabel = useMemo(
    () => `${sheetLines.length} carton${sheetLines.length !== 1 ? "s" : ""}`,
    [sheetLines.length],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={backHref} className="text-sm font-medium text-zinc-700 underline">
          ← Back
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {canEditBatches && !editMode ? (
            <Link
              href={editUrl}
              className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-zinc-900 shadow-sm ring-1 ring-zinc-200"
            >
              Edit batches
            </Link>
          ) : null}
          {canEditBatches && editMode ? (
            <>
              <Link
                href={sheetUrl}
                className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-zinc-900 shadow-sm ring-1 ring-zinc-200"
              >
                View only
              </Link>
              <button
                type="button"
                onClick={onSave}
                disabled={saving}
                className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save batches"}
              </button>
            </>
          ) : null}
          <PrintSheetButton />
        </div>
      </div>

      {error ? <p className="text-sm text-red-700 print:hidden">{error}</p> : null}
      {saved ? <p className="text-sm text-emerald-700 print:hidden">Batch numbers saved.</p> : null}

      <div className="rounded-xl border border-zinc-900 bg-white p-4 text-black shadow-sm print:border-0 print:p-2 print:shadow-none">
        <div className="mb-4 grid grid-cols-1 gap-2 text-sm md:grid-cols-2 print:text-xs">
          <div className="flex gap-2 border-b border-zinc-300 py-1">
            <span className="font-semibold whitespace-nowrap">VEHICLE NO:</span>
            <span className="min-h-[1.25rem] flex-1 border-b border-dotted border-zinc-400 print:border-black" />
          </div>
          <div className="flex gap-2 border-b border-zinc-300 py-1">
            <span className="font-semibold whitespace-nowrap">DRIVER NAME:</span>
            <span className="min-h-[1.25rem] flex-1 border-b border-dotted border-zinc-400 print:border-black" />
          </div>
          <div className="flex gap-2 border-b border-zinc-300 py-1">
            <span className="font-semibold whitespace-nowrap">DC NO:</span>
            <span className="min-h-[1.25rem] flex-1 border-b border-dotted border-zinc-400 print:border-black" />
          </div>
          <div className="flex gap-2 border-b border-zinc-300 py-1">
            <span className="font-semibold whitespace-nowrap">Date:</span>
            <span className="flex-1 border-b border-dotted border-zinc-400 print:border-black">{createdDate}</span>
          </div>
          <div className="flex gap-2 border-b border-zinc-300 py-1 md:col-span-2">
            <span className="font-semibold whitespace-nowrap">HELPER NAME:</span>
            <span className="min-h-[1.25rem] flex-1 border-b border-dotted border-zinc-400 print:border-black" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-black text-sm print:text-[11px]">
            <thead>
              <tr className="bg-zinc-100 print:bg-transparent">
                <th className="border border-black px-1 py-2 font-semibold">Box No</th>
                <th className="border border-black px-1 py-2 font-semibold">PRODUCT NAME</th>
                <th className="border border-black px-1 py-2 font-semibold">NO OF BOTTLES</th>
                <th className="border border-black px-1 py-2 font-semibold">Batch No</th>
                <th className="border border-black px-1 py-2 font-semibold">Weight</th>
                <th className="border border-black px-1 py-2 font-semibold">PO NO</th>
                <th className="border border-black px-1 py-2 font-semibold">Customer Co</th>
              </tr>
            </thead>
            <tbody>
              {sheetLines.map((row) => {
                const batchValue = batches[row.boxNo] ?? "";
                const showInputs = editMode && canEditBatches;
                return (
                  <tr key={row.boxNo}>
                    <td className="border border-black px-1 py-1 text-center">{row.boxNo}</td>
                    <td className="border border-black px-1 py-1">{row.productName}</td>
                    <td className="border border-black px-1 py-1 text-center">{row.bottlesPerBox}</td>
                    <td className="border border-black px-1 py-1 text-center">
                      {showInputs ? (
                        <>
                          <input
                            type="text"
                            value={batchValue}
                            onChange={(e) => {
                              setSaved(false);
                              setBatches((prev) => ({ ...prev, [row.boxNo]: e.target.value }));
                            }}
                            className="w-full min-w-[4rem] rounded border border-zinc-300 px-1 py-0.5 text-center text-sm print:hidden"
                            placeholder="Batch"
                          />
                          <span className="hidden print:inline">{batchValue}</span>
                        </>
                      ) : (
                        batchValue
                      )}
                    </td>
                    <td className="border border-black px-1 py-1 text-center">
                      {row.weight != null ? row.weight : ""}
                    </td>
                    <td className="border border-black px-1 py-1 text-center">{poNumber}</td>
                    <td className="border border-black px-1 py-1">{customerName}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 text-sm md:grid-cols-3 print:mt-6 print:text-xs">
          <div className="flex flex-col gap-1">
            <span className="font-semibold">PRODUCTION INCHARGE:</span>
            <span className="min-h-[2rem] border-b border-black" />
          </div>
          <div className="flex flex-col gap-1">
            <span className="font-semibold">SECURITY:</span>
            <span className="min-h-[2rem] border-b border-black" />
          </div>
          <div className="flex flex-col gap-1">
            <span className="font-semibold">DRIVER:</span>
            <span className="min-h-[2rem] border-b border-black" />
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-zinc-600 print:text-[10px]">
          Loading sheet · PO {poNumber} · {cartonLabel}
        </p>
      </div>
    </div>
  );
}
