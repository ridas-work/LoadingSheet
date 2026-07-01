import Link from "next/link";

import { FieldVisitList } from "@/components/FieldVisitList";

export default function AdminFieldVisitsPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin" className="text-sm text-zinc-600 hover:text-zinc-900">
          ← Admin summary
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">Field visits</h1>
        <p className="mt-1 text-sm text-zinc-600">
          All sample visit tickets — search by customer, place, city, phone, product, or notes.
          Status, follow-up reminders, and rep points.
        </p>
      </div>
      <FieldVisitList showRep />
    </div>
  );
}
