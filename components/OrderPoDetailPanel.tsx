import type { OrderPoDetail } from "@/lib/orderPoDetail";

type Props = {
  detail: OrderPoDetail;
  compact?: boolean;
};

export function OrderPoDetailPanel({ detail, compact = false }: Props) {
  if (detail.sections.length === 0) {
    return <p className="text-xs text-zinc-500">No product lines on this PO.</p>;
  }

  return (
    <div className={`space-y-2 ${compact ? "text-xs" : "text-sm"}`}>
      {detail.sections.map((section) => (
        <div key={section.title}>
          <div className="font-semibold text-zinc-800">{section.title}</div>
          <ul className="mt-0.5 list-inside list-disc text-zinc-700">
            {section.lines.map((line) => (
              <li key={`${section.title}-${line}`}>{line}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
