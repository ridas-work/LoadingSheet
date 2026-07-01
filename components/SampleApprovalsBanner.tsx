"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ui } from "@/lib/ui";

export function SampleApprovalsBanner() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/pending-approvals");
        if (!res.ok) return;
        const data = (await res.json()) as {
          pendingCount?: number;
          pendingPoCount?: number;
          pendingFieldSampleCount?: number;
        };
        if (!cancelled) setCount(data.pendingCount ?? 0);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (count === 0) return null;

  return (
    <div className={`${ui.alertWarning} mx-4 print:hidden`}>
      <p className="text-sm font-medium">
        {count} sample request{count === 1 ? "" : "s"} from the PO team waiting for your approval.
      </p>
      <Link href="/admin/approvals" className="mt-1 inline-block text-sm font-medium underline">
        Review sample requests
      </Link>
    </div>
  );
}
