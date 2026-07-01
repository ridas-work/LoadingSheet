import Link from "next/link";

type Props = {
  active: "open" | "closed";
};

export function ProductionBatchTabs({ active }: Props) {
  const tabClass = (isActive: boolean) =>
    `rounded-lg px-3 py-1.5 text-sm font-medium ${
      isActive ? "bg-brand-800 text-white" : "bg-white text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-50"
    }`;

  return (
    <div className="flex flex-wrap gap-2">
      <Link href="/production/batches" className={tabClass(active === "open")}>
        Active batches
      </Link>
      <Link href="/production/batches/closed" className={tabClass(active === "closed")}>
        Closed batches
      </Link>
    </div>
  );
}
