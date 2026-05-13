import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { roleFromSession } from "@/lib/roles";

export default async function NewOrderLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const role = roleFromSession(session?.user as { role?: string });
  if (role === "batch_editor") {
    redirect("/production/batches");
  }
  return children;
}
