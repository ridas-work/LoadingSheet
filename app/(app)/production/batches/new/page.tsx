import Link from "next/link";

import { ProductionBatchForm } from "@/components/ProductionBatchForm";
import { auth } from "@/lib/auth";
import type { ProductionPurpose } from "@/lib/productionBatchApi";
import { canEditProductionBatches, roleFromSession } from "@/lib/roles";
import { redirect } from "next/navigation";

type PageProps = {
  searchParams: Promise<{ purpose?: string }>;
};

export default async function NewProductionBatchPage(props: PageProps) {
  const session = await auth();
  const role = roleFromSession(session?.user as { role?: string });
  if (!canEditProductionBatches(role)) {
    redirect("/production/batches");
  }

  const { purpose } = await props.searchParams;
  const initialProductionPurpose: ProductionPurpose = purpose === "sample" ? "sample" : "regular";

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <Link href="/production/batches" className="text-sm font-medium text-zinc-700 underline">
          ← Back to batches
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">Add production batch</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Record a prepared batch before dispatch assigns it to a PO.
        </p>
      </div>
      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <ProductionBatchForm initialProductionPurpose={initialProductionPurpose} />
      </div>
    </div>
  );
}
