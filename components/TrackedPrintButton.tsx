"use client";

import { recordPrint } from "@/lib/logPrintClient";
import type { PrintLogInput } from "@/lib/printLog.types";

type Props = {
  printLog: PrintLogInput;
  children: React.ReactNode;
  className?: string;
};

export function TrackedPrintButton({ printLog, children, className }: Props) {
  return (
    <button
      type="button"
      onClick={() => {
        recordPrint(printLog);
        window.print();
      }}
      className={className}
    >
      {children}
    </button>
  );
}
