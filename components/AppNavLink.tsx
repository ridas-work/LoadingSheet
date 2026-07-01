"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ui } from "@/lib/ui";

type Props = {
  href: string;
  label: string;
  external?: boolean;
  matchPrefix?: boolean;
};

function isActive(pathname: string, href: string, matchPrefix: boolean): boolean {
  if (href === "/") return pathname === "/";
  if (matchPrefix) return pathname === href || pathname.startsWith(`${href}/`);
  return pathname === href;
}

export function AppNavLink({ href, label, external, matchPrefix = true }: Props) {
  const pathname = usePathname() ?? "";
  const active = !external && isActive(pathname, href, matchPrefix);

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={ui.navLink}>
        {label} ↗
      </a>
    );
  }

  return (
    <Link href={href} className={`${ui.navLink}${active ? ` ${ui.navLinkActive}` : ""}`}>
      {label}
    </Link>
  );
}
