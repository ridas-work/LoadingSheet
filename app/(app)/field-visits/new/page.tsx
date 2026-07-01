"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/** Legacy URL — auto-create a draft ticket and redirect to detail. */
export default function NewFieldVisitRedirectPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/field-visits", {
          method: "POST",
          credentials: "same-origin",
          headers: { "content-type": "application/json" },
          body: "{}",
        });
        const data = (await res.json()) as { ticket?: { id: string }; error?: string };
        if (cancelled) return;
        if (res.ok && data.ticket?.id) {
          router.replace(`/field-visits/${data.ticket.id}`);
          return;
        }
        setError(data.error ?? "Could not start a new visit.");
      } catch {
        if (!cancelled) setError("Could not start a new visit.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (error) {
    return (
      <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-800">
        {error}
      </p>
    );
  }

  return <p className="text-sm text-zinc-600">Starting new visit…</p>;
}
