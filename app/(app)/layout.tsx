import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

import { LogoutButton } from "./logout-button";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="min-h-dvh bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Link href="/new-order" className="text-sm font-semibold text-zinc-900">
            Loading Sheet
          </Link>
          <div className="flex items-center gap-3">
            <div className="text-sm text-zinc-700">Signed in as {session.user.name}</div>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6">{children}</main>
    </div>
  );
}

