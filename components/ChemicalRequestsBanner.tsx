"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ui } from "@/lib/ui";

export function ChemicalRequestsBanner() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/chemical-material-requests?status=pending");
        if (!res.ok) return;
        const data = (await res.json()) as { pendingCount?: number };
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
        {count} chemical material request{count === 1 ? "" : "s"} waiting for approval.
      </p>
      <Link href="/admin/chemical-requests" className="mt-1 inline-block text-sm font-medium underline">
        Review chemical requests
      </Link>
    </div>
  );
}
