import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { homePathForRole, roleFromSession } from "@/lib/roles";

export default async function GateLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const role = roleFromSession(session?.user as { role?: string });
  if (role !== "gate_guard") {
    redirect(role ? homePathForRole(role) : "/login");
  }
  return children;
}
