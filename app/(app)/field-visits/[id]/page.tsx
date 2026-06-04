import { redirect } from "next/navigation";

import { FieldVisitDetailForm } from "@/components/FieldVisitDetailForm";
import { auth } from "@/lib/auth";
import { canAccessFieldVisits, roleFromSession } from "@/lib/roles";

export default async function FieldVisitDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const role = roleFromSession(session?.user as { role?: string });
  const username = (session?.user as { username?: string })?.username;
  if (!canAccessFieldVisits(role, username)) {
    redirect(role ? "/new-order" : "/login");
  }

  const { id } = await params;

  return (
    <div>
      <FieldVisitDetailForm id={id} readOnly={role === "admin"} />
    </div>
  );
}
