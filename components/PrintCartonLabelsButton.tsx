"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

import type { CartonLabel } from "@/lib/cartonLabels";
import { recordPrint } from "@/lib/logPrintClient";
import type { PrintLogInput } from "@/lib/printLog.types";

type Props = {
  poNumber: string;
  customerName: string;
  labels: CartonLabel[];
  printLog?: PrintLogInput;
};

function CartonSticker({
  label,
  poNumber,
  customerName,
}: {
  label: CartonLabel;
  poNumber: string;
  customerName: string;
}) {
  return (
    <section className="carton-label-sheet flex min-h-[70vh] items-center justify-center py-8 print:min-h-screen print:py-0">
      <div className="carton-label-sticker w-[100mm] min-h-[70mm] border-2 border-black p-[8mm] text-black">
        <h1 className="carton-label-title mb-[6mm] text-center text-[18pt] leading-tight font-bold break-words">
          {label.title}
        </h1>
        {label.contents.length > 0 ? (
          <ul className="carton-label-contents mb-[6mm] list-none text-[11pt] leading-snug">
            {label.contents.map((c) => (
              <li key={`${c.productName}-${c.bottles}`}>
                {c.productName} × {c.bottles}
              </li>
            ))}
          </ul>
        ) : null}
        <div className="carton-label-meta border-t border-black pt-[4mm] text-[9pt] leading-snug">
          <div>
            <span className="mr-2 inline-block min-w-[14mm] font-bold">PO</span>
            {poNumber}
          </div>
          <div>
            <span className="mr-2 inline-block min-w-[14mm] font-bold">Customer</span>
            {customerName}
          </div>
          <div>
            <span className="mr-2 inline-block min-w-[14mm] font-bold">Box</span>#{label.boxNo}
          </div>
        </div>
      </div>
    </section>
  );
}

export function PrintCartonLabelsButton({ poNumber, customerName, labels, printLog }: Props) {
  const [open, setOpen] = useState(false);

  const runPrint = useCallback(() => {
    if (printLog) recordPrint(printLog);
    document.body.classList.add("printing-carton-labels");
    window.print();
  }, [printLog]);

  useEffect(() => {
    if (!open) return;
    const onAfterPrint = () => {
      document.body.classList.remove("printing-carton-labels");
    };
    window.addEventListener("afterprint", onAfterPrint);
    return () => {
      window.removeEventListener("afterprint", onAfterPrint);
      document.body.classList.remove("printing-carton-labels");
    };
  }, [open]);

  if (labels.length === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-zinc-900 shadow-sm ring-1 ring-zinc-200 print:hidden"
      >
        Print carton labels ({labels.length})
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              className="carton-labels-overlay fixed inset-0 z-[100] overflow-y-auto bg-zinc-900/60 p-4 print:bg-white print:p-0"
              role="dialog"
              aria-modal="true"
              aria-label="Carton label preview"
            >
              <div className="carton-labels-panel mx-auto max-w-3xl rounded-xl bg-white p-4 shadow-xl print:mx-0 print:max-w-none print:rounded-none print:p-0 print:shadow-none">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2 print:hidden">
                  <p className="text-sm font-medium text-zinc-900">
                    {labels.length} carton label{labels.length === 1 ? "" : "s"} — check below, then print
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-zinc-900 ring-1 ring-zinc-200"
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      onClick={runPrint}
                      className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white"
                    >
                      Print labels
                    </button>
                  </div>
                </div>

                {labels.map((label) => (
                  <CartonSticker
                    key={label.boxNo}
                    label={label}
                    poNumber={poNumber}
                    customerName={customerName}
                  />
                ))}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
