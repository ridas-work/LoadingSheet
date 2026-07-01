"use client";

import { signOut } from "next-auth/react";

import { ui } from "@/lib/ui";

export function LogoutButton() {
  return (
    <button type="button" onClick={() => signOut({ callbackUrl: "/login" })} className={ui.btnGhost}>
      Log out
    </button>
  );
}
