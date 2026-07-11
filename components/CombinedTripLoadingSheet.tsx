"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { flushSync } from "react-dom";

import { PrintSheetButton } from "@/components/PrintSheetButton";
import { formatDisplayDateTime } from "@/lib/dateOnly";
import { usePrintAuditLog } from "@/lib/logPrintClient";
import { isMixedSampleLine } from "@/lib/mixedSampleBox";
import { formatKg } from "@/lib/standardCartonWeight";

export type CombinedTripLine = {
  boxNo: number;
  productName: string;
  bottlesPerBox: number;
  lineKind?: string;
  mixedContents?: Array<{ productName: string; bottles: number }>;
  batchNo?: string | null;
  componentBatches?: Array<{ productName: string; batchNo?: string | null }>;
  cartonWeightKg?: number | null;
};

export type CombinedTripOrder = {
  id: string;
  poNumber: string;
  customerName: string;
  challanNo: string;
  lines: CombinedTripLine[];
};

type Props = {
  tripId: string;
  vehicleNo: string;
  driverName: string;
  helperName: string;
  productionIncharge: string;
  securityName: string;
  driverSignature: string;
  tripDate: string;
  orders: CombinedTripOrder[];
};

function formatPrintedAt(date: Date) {
  return formatDisplayDateTime(date);
}

function HeaderField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 border-b border-zinc-300 py-1">
      <span className="font-semibold whitespace-nowrap">{label}</span>
      <span className="min-h-[1.25rem] flex-1 border-b border-dotted border-zinc-400 print:border-black">
        {value}
      </span>
    </div>
  );
}

function FooterField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-semibold">{label}</span>
      <span className="min-h-[2rem] border-b border-black">{value}</span>
    </div>
  );
}

function batchDisplay(line: CombinedTripLine): string {
  const components = line.componentBatches ?? [];
  const filledComponents = components.filter((component) => component.batchNo?.trim());
  if (filledComponents.length > 0) {
    return filledComponents
      .map((component) => `${component.productName}: ${component.batchNo?.trim()}`)
      .join(", ");
  }
  return line.batchNo?.trim() || "—";
}

export function CombinedTripLoadingSheet({
  tripId,
  vehicleNo,
  driverName,
  helperName,
  productionIncharge,
  securityName,
  driverSignature,
  tripDate,
  orders,
}: Props) {
  const [printedAt, setPrintedAt] = useState<Date | null>(null);

  const updatePrintedAt = useCallback(() => {
    flushSync(() => {
      setPrintedAt(new Date());
    });
  }, []);

  useEffect(() => {
    window.addEventListener("beforeprint", updatePrintedAt);

    return () => {
      window.removeEventListener("beforeprint", updatePrintedAt);
    };
  }, [updatePrintedAt]);

  const poList = useMemo(() => orders.map((order) => order.poNumber).join(", "), [orders]);
  const printLog = useMemo(
    () => ({
      documentType: "trip_loading_sheet" as const,
      documentTitle: `Trip ${vehicleNo} — ${poList}`,
      referenceId: tripId,
      referencePath: `/dispatch/trips/${tripId}/loading-sheet`,
      metadata: { vehicleNo, poCount: orders.length, tripDate },
    }),
    [tripId, vehicleNo, poList, orders.length, tripDate],
  );
  const totalCartons = useMemo(
    () => orders.reduce((sum, order) => sum + order.lines.length, 0),
    [orders],
  );

  usePrintAuditLog(printLog);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/dispatch/trips/${tripId}`} className="text-sm font-medium text-zinc-700 underline">
          ← Back to trip
        </Link>
        <PrintSheetButton onBeforePrint={updatePrintedAt} printLog={printLog} />
      </div>

      <div className="rounded-xl border border-zinc-900 bg-white p-4 text-black shadow-sm print:border-0 print:p-2 print:shadow-none">
        <div className="mb-3">
          <h1 className="text-center text-lg font-semibold uppercase tracking-wide print:text-base">
            Combined vehicle loading sheet
          </h1>
          <p className="mt-1 text-center text-xs text-zinc-600 print:text-[10px] print:text-black">
            {orders.length} PO{orders.length === 1 ? "" : "s"} · {totalCartons} carton
            {totalCartons === 1 ? "" : "s"}
          </p>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-2 text-sm md:grid-cols-2 print:text-xs">
          <HeaderField label="VEHICLE NO:" value={vehicleNo} />
          <HeaderField label="DRIVER NAME:" value={driverName} />
          <HeaderField label="DATE:" value={tripDate} />
          <HeaderField label="PO NOS:" value={poList} />
          <div className="text-xs text-zinc-500 md:col-span-2 print:text-[10px] print:text-black">
            Printed: {printedAt ? formatPrintedAt(printedAt) : "Not printed yet"}
          </div>
          <div className="md:col-span-2">
            <HeaderField label="HELPER NAME:" value={helperName} />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-black text-sm print:text-[10px]">
            <thead>
              <tr className="bg-zinc-100 print:bg-transparent">
                <th className="border border-black px-1 py-2 font-semibold">Box No</th>
                <th className="border border-black px-1 py-2 font-semibold">PRODUCT NAME</th>
                <th className="border border-black px-1 py-2 font-semibold">NO OF BOTTLES</th>
                <th className="border border-black px-1 py-2 font-semibold">Batch No</th>
                <th className="border border-black px-1 py-2 font-semibold">Carton wt (kg)</th>
                <th className="border border-black px-1 py-2 font-semibold">PO NO</th>
                <th className="border border-black px-1 py-2 font-semibold">Challan / DC</th>
                <th className="border border-black px-1 py-2 font-semibold">Customer Co</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) =>
                order.lines.map((row) => (
                  <tr key={`${order.id}-${row.boxNo}`} className="break-inside-avoid">
                    <td className="border border-black px-1 py-1 text-center">{row.boxNo}</td>
                    <td className="border border-black px-1 py-1">
                      <div>{row.productName}</div>
                      {isMixedSampleLine(row) && row.mixedContents?.length ? (
                        <ul className="mt-1 list-none text-[10px] text-zinc-700 print:text-[9px]">
                          {row.mixedContents.map((content) => (
                            <li key={`${content.productName}-${content.bottles}`}>
                              {content.productName} × {content.bottles}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </td>
                    <td className="border border-black px-1 py-1 text-center">{row.bottlesPerBox}</td>
                    <td className="border border-black px-1 py-1 text-center">{batchDisplay(row)}</td>
                    <td className="border border-black px-1 py-1 text-center">
                      {row.cartonWeightKg != null ? formatKg(row.cartonWeightKg) : ""}
                    </td>
                    <td className="border border-black px-1 py-1 text-center">{order.poNumber}</td>
                    <td className="border border-black px-1 py-1 text-center">{order.challanNo}</td>
                    <td className="border border-black px-1 py-1">{order.customerName}</td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 text-sm md:grid-cols-3 print:mt-6 print:text-xs">
          <FooterField label="PRODUCTION INCHARGE:" value={productionIncharge} />
          <FooterField label="SECURITY:" value={securityName} />
          <FooterField label="DRIVER:" value={driverSignature || driverName} />
        </div>

        <p className="mt-6 text-center text-xs text-zinc-600 print:text-[10px]">
          Loading sheet · Vehicle {vehicleNo || "—"} · POs {poList || "—"}
        </p>
      </div>
    </div>
  );
}
