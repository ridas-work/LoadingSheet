import { redirect } from "next/navigation";
import mongoose from "mongoose";

import { FieldVisitDetailForm } from "@/components/FieldVisitDetailForm";
import { MarketVisitForm } from "@/components/MarketVisitForm";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { canEditFieldVisit, canViewFieldVisit, shouldUseMarketVisitForm } from "@/lib/fieldVisitTickets";
import { FieldVisitTicket } from "@/lib/models/FieldVisitTicket";
import { canAccessFieldVisits, roleFromSession } from "@/lib/roles";

export default async function FieldVisitDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const role = roleFromSession(session?.user as { role?: string });
  const username = (session?.user as { username?: string })?.username;
  const userId = (session?.user as { id?: string })?.id ?? "";
  if (!canAccessFieldVisits(role, username)) {
    redirect(role ? "/new-order" : "/login");
  }

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    redirect("/field-visits");
  }

  await connectToDatabase();
  const ticket = await FieldVisitTicket.findById(id).lean();
  if (!ticket || !canViewFieldVisit(role, username, ticket, userId)) {
    redirect("/field-visits");
  }

  const readOnly = role === "admin" || !canEditFieldVisit(role, username, ticket, userId);
  const useMarketForm = shouldUseMarketVisitForm(ticket);

  return (
    <div>
      {useMarketForm ? (
        <MarketVisitForm id={id} readOnly={readOnly} />
      ) : (
        <FieldVisitDetailForm id={id} readOnly={readOnly} />
      )}
    </div>
  );
}
