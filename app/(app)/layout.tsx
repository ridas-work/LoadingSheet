import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { homePathForRole, roleFromSession } from "@/lib/roles";

import { LogoutButton } from "./logout-button";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const role = roleFromSession(session.user as { role?: string });
  const homeHref = role ? homePathForRole(role) : "/new-order";

  return (
    <div className="min-h-dvh bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <Link href={homeHref} className="text-sm font-semibold text-zinc-900">
              Loading Sheet
            </Link>
            {role !== "batch_editor" ? (
              <Link href="/orders" className="text-sm text-zinc-600 hover:text-zinc-900">
                Orders
              </Link>
            ) : null}
            {role === "po_creator" ? (
              <Link href="/new-order" className="text-sm text-zinc-600 hover:text-zinc-900">
                New order
              </Link>
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-zinc-700">{session.user.name}</span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6">{children}</main>
    </div>
  );
}
