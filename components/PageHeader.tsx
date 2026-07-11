import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

import type { PortalAccent } from "@/lib/portalTheme";
import { ui } from "@/lib/ui";

type Props = {
  title: string;
  description?: ReactNode;
  backHref?: string;
  backLabel?: string;
  actions?: ReactNode;
  accent?: Exclude<PortalAccent, "signup">;
  className?: string;
};

const ACCENT_CLASS: Record<Exclude<PortalAccent, "signup">, string> = {
  rashid: "page-header-accent-rashid",
  esha: "page-header-accent-esha",
  ali: "page-header-accent-ali",
};

export function PageHeader({
  title,
  description,
  backHref,
  backLabel = "Back",
  actions,
  accent,
  className,
}: Props) {
  const accentClass = accent ? ACCENT_CLASS[accent] : "";
  const descClass = accent ? "page-header-desc-accent" : ui.pageDesc;

  return (
    <div
      className={`${ui.pageHeader} flex flex-wrap items-start justify-between gap-4 ${accentClass} ${className ?? ""}`}
      style={accent ? ({ "--portal-accent": `var(--portal-${accent})` } as CSSProperties) : undefined}
    >
      <div>
        {backHref ? (
          <Link href={backHref} className={`${ui.linkBack} mb-2 inline-block`}>
            ← {backLabel}
          </Link>
        ) : null}
        <h1 className={ui.pageTitle}>{title}</h1>
        {description ? <p className={descClass}>{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
