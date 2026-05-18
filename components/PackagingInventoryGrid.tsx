"use client";

import Link from "next/link";
import { useMemo } from "react";

import { CATEGORY_LABELS } from "@/lib/packagingInventory";

export type PackagingItemRow = {
  code: string;
  name: string;
  category: string;
  unit: string;
  onHand: number;
  linkedProductCode?: string;
  updatedAt?: string;
};

type Props = {
  items: PackagingItemRow[];
  readOnly?: boolean;
};

const CATEGORY_ORDER = ["bottle", "cap", "sticker", "label", "other"];

export function PackagingInventoryGrid({ items, readOnly }: Props) {
  const grouped = useMemo(() => {
    const map = new Map<string, PackagingItemRow[]>();
    for (const cat of CATEGORY_ORDER) map.set(cat, []);
    for (const item of items) {
      const key = CATEGORY_ORDER.includes(item.category) ? item.category : "other";
      map.get(key)!.push(item);
    }
    return CATEGORY_ORDER.map((cat) => ({
      category: cat,
      label: CATEGORY_LABELS[cat] ?? cat,
      items: map.get(cat) ?? [],
    })).filter((g) => g.items.length > 0);
  }, [items]);

  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-600">
        No packaging items in catalog. Run <code className="text-xs">npm run seed:packaging</code>.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {grouped.map((group) => (
        <section
          key={group.category}
          className="overflow-hidden rounded-xl border border-zinc-200 bg-white"
        >
          <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-2">
            <h2 className="text-sm font-semibold text-zinc-900">{group.label}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[32rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-zinc-100 text-left text-xs text-zinc-600">
                  <th className="px-4 py-2 font-medium">Item</th>
                  <th className="w-28 px-4 py-2 text-right font-medium">On hand</th>
                  <th className="w-24 px-4 py-2 font-medium">Unit</th>
                  {!readOnly ? <th className="w-32 px-4 py-2" /> : null}
                </tr>
              </thead>
              <tbody>
                {group.items.map((item) => (
                  <tr key={item.code} className="border-b border-zinc-50">
                    <td className="px-4 py-2">
                      <div className="font-medium text-zinc-900">{item.name}</div>
                      {item.linkedProductCode ? (
                        <div className="text-[11px] text-zinc-500">Product: {item.linkedProductCode}</div>
                      ) : null}
                    </td>
                    <td className="px-4 py-2 text-right font-semibold tabular-nums text-zinc-900">
                      {item.onHand.toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-zinc-600">{item.unit}</td>
                    {!readOnly ? (
                      <td className="px-4 py-2 text-right">
                        <Link
                          href={`/dispatch/inventory/${encodeURIComponent(item.code)}`}
                          className="rounded-lg bg-zinc-900 px-2 py-1.5 text-xs font-medium text-white"
                        >
                          Update count
                        </Link>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
