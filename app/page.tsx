import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { homePathForRole, roleFromSession } from "@/lib/roles";

export default async function Home() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  const role = roleFromSession(session.user as { role?: string });
  redirect(role ? homePathForRole(role) : "/new-order");
}
