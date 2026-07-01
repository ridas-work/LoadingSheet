import { redirect } from "next/navigation";

import { FieldVisitList } from "@/components/FieldVisitList";
import { auth } from "@/lib/auth";
import { canAccessFieldVisits, roleFromSession } from "@/lib/roles";

export default async function FieldVisitsPage() {
  const session = await auth();
  const role = roleFromSession(session?.user as { role?: string });
  const username = (session?.user as { username?: string })?.username;
  if (!canAccessFieldVisits(role, username)) {
    redirect(role ? "/new-order" : "/login");
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Field visits</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Start a visit, choose whether there is a sample (none, we send, or customer gave), log each
          trip back, then close when the customer orders or the deal is lost. Use search to find
          customers or any visit detail.
        </p>
      </div>
      <FieldVisitList />
    </div>
  );
}
