import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { homePathForRole, isAdmin, roleFromSession } from "@/lib/roles";

import { LogoutButton } from "./logout-button";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const role = roleFromSession(session.user as { role?: string });
  const homeHref = role ? homePathForRole(role) : "/new-order";
  const admin = isAdmin(role);

  return (
    <div className="min-h-dvh bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div
          className={`mx-auto flex items-center justify-between px-4 py-3 ${
            admin || role === "dispatch_editor" || role === "packaging_editor"
              ? "max-w-[1600px]"
              : role === "gate_guard"
                ? "max-w-5xl"
                : "max-w-4xl"
          }`}
        >
          <div className="flex flex-wrap items-center gap-4">
            <Link href={homeHref} className="text-sm font-semibold text-zinc-900">
              Loading Sheet
            </Link>
            {admin ? (
              <>
                <Link href="/admin" className="text-sm text-zinc-600 hover:text-zinc-900">
                  Summary
                </Link>
                <Link href="/orders" className="text-sm text-zinc-600 hover:text-zinc-900">
                  Orders
                </Link>
                <Link href="/production/batches" className="text-sm text-zinc-600 hover:text-zinc-900">
                  Production batches
                </Link>
                <Link href="/dispatch/trips" className="text-sm text-zinc-600 hover:text-zinc-900">
                  Dispatch trips
                </Link>
                <Link href="/dispatch/inventory" className="text-sm text-zinc-600 hover:text-zinc-900">
                  Packaging inventory
                </Link>
                <Link href="/dispatch/filling" className="text-sm text-zinc-600 hover:text-zinc-900">
                  Daily filling
                </Link>
              </>
            ) : null}
            {role === "gate_guard" ? (
              <Link href="/gate/orders" className="text-sm text-zinc-600 hover:text-zinc-900">
                Gate orders
              </Link>
            ) : null}
            {role !== "batch_editor" && role !== "gate_guard" && role !== "packaging_editor" && !admin ? (
              <Link href="/orders" className="text-sm text-zinc-600 hover:text-zinc-900">
                Orders
              </Link>
            ) : null}
            {role === "dispatch_editor" ? (
              <>
                <Link href="/dispatch/trips" className="text-sm text-zinc-600 hover:text-zinc-900">
                  Dispatch trips
                </Link>
                <Link href="/dispatch/inventory" className="text-sm text-zinc-600 hover:text-zinc-900">
                  Packaging inventory
                </Link>
                <Link href="/dispatch/filling" className="text-sm text-zinc-600 hover:text-zinc-900">
                  Daily filling
                </Link>
              </>
            ) : null}
            {role === "packaging_editor" ? (
              <Link href="/dispatch/inventory" className="text-sm text-zinc-600 hover:text-zinc-900">
                Packaging inventory
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
      <main
        className={`mx-auto px-4 py-6 ${
          admin || role === "dispatch_editor" || role === "packaging_editor"
            ? "max-w-[1600px]"
            : role === "gate_guard"
              ? "max-w-5xl"
              : "max-w-4xl"
        }`}
      >
        {children}
      </main>
    </div>
  );
}
