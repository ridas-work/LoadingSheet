"use client";

import { useEffect } from "react";

import type { PrintLogInput } from "@/lib/printLog.types";

let lastDedupeKey = "";
let lastDedupeAt = 0;

function dedupeKey(input: PrintLogInput): string {
  return `${input.documentType}|${input.referenceId ?? ""}|${input.documentTitle}`;
}

/** Fire-and-forget print audit log (deduped within 2s for button + beforeprint). */
export function recordPrint(input: PrintLogInput): void {
  const key = dedupeKey(input);
  const now = Date.now();
  if (key === lastDedupeKey && now - lastDedupeAt < 2000) return;
  lastDedupeKey = key;
  lastDedupeAt = now;

  void fetch("/api/print-logs", {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  }).catch(() => {
    /* non-blocking */
  });
}

/** Log prints triggered via browser menu (Ctrl+P) as well as buttons. */
export function usePrintAuditLog(printLog: PrintLogInput | undefined): void {
  useEffect(() => {
    if (!printLog) return;

    let logged = false;
    const onBeforePrint = () => {
      if (logged) return;
      logged = true;
      recordPrint(printLog);
    };
    const onAfterPrint = () => {
      logged = false;
    };

    window.addEventListener("beforeprint", onBeforePrint);
    window.addEventListener("afterprint", onAfterPrint);
    return () => {
      window.removeEventListener("beforeprint", onBeforePrint);
      window.removeEventListener("afterprint", onAfterPrint);
    };
  }, [printLog]);
}
