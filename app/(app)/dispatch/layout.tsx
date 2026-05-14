import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { adminCanViewOperations, homePathForRole, roleFromSession } from "@/lib/roles";

export default async function DispatchLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const role = roleFromSession(session?.user as { role?: string });
  if (role !== "dispatch_editor" && !adminCanViewOperations(role)) {
    redirect(role ? homePathForRole(role) : "/login");
  }
  return children;
}
