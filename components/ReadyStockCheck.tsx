"use client";

import { useEffect, useMemo, useState } from "react";

type Need = { productCode: string; productName: string; bottles: number };

type Props = {
  needs: Need[];
};

export function ReadyStockCheck({ needs }: Props) {
  const [stock, setStock] = useState<Record<string, number>>({});

  useEffect(() => {
    if (needs.length === 0) return;
    (async () => {
      const res = await fetch("/api/ready-bottle-stock", { credentials: "same-origin" });
      if (!res.ok) return;
      const data = (await res.json()) as { products?: Array<{ productCode: string; onHandBottles: number }> };
      const map: Record<string, number> = {};
      for (const p of data.products ?? []) {
        map[p.productCode] = p.onHandBottles;
      }
      setStock(map);
    })();
  }, [needs]);

  const rows = useMemo(() => {
    return needs.map((n) => {
      const onHand = stock[n.productCode] ?? 0;
      const fromReady = Math.min(onHand, n.bottles);
      const needingBatch = Math.max(0, n.bottles - onHand);
      return {
        ...n,
        onHand,
        fromReady,
        needingBatch,
        ok: needingBatch === 0,
      };
    });
  }, [needs, stock]);

  if (needs.length === 0) return null;

  const allOk = rows.every((r) => r.ok);

  return (
    <div
      className={`rounded-lg border px-3 py-2 text-sm print:hidden ${
        allOk ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-200 bg-amber-50 text-amber-950"
      }`}
    >
      <div className="font-medium">Ready bottle stock vs this PO</div>
      <ul className="mt-1 space-y-0.5 text-xs">
        {rows.map((r) => (
          <li key={r.productCode}>
            {r.productName}: need <strong>{r.bottles}</strong>, on hand <strong>{r.onHand}</strong>
            {r.fromReady > 0 ? (
              <span className="text-emerald-800">
                {" "}
                — <strong>{r.fromReady}</strong> from ready shelf
              </span>
            ) : null}
            {r.needingBatch > 0 ? (
              <span className="text-red-800">
                {" "}
                — assign QC batch for <strong>{r.needingBatch}</strong> bottle
                {r.needingBatch !== 1 ? "s" : ""}
              </span>
            ) : (
              <span className="text-emerald-800"> — all covered by ready shelf</span>
            )}
          </li>
        ))}
      </ul>
      <p className="mt-1 text-[11px]">
        {allOk ? (
          <>
            Cartons from ready shelf show the <strong>batch no.</strong> Rashid logged — no QC batch needed.
            Ready stock deducts when Zaman marks <strong>Delivered</strong>.
          </>
        ) : (
          <>
            Assign QC batch only on cartons marked below the table. Ready shelf cartons need no batch.
            Fill short products on Daily filling, then assign batch here.
          </>
        )}
      </p>
    </div>
  );
}
