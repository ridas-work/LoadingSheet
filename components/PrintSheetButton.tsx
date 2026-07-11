"use client";

import { recordPrint } from "@/lib/logPrintClient";
import type { PrintLogInput } from "@/lib/printLog.types";

type Props = {
  onBeforePrint?: () => void;
  printLog?: PrintLogInput;
};

export function PrintSheetButton({ onBeforePrint, printLog }: Props) {
  return (
    <button
      type="button"
      onClick={() => {
        onBeforePrint?.();
        if (printLog) recordPrint(printLog);
        window.print();
      }}
      className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white print:hidden"
    >
      Print loading sheet
    </button>
  );
}
