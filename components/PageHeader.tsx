import Link from "next/link";
import type { ReactNode } from "react";

import { ui } from "@/lib/ui";

type Props = {
  title: string;
  description?: ReactNode;
  backHref?: string;
  backLabel?: string;
  actions?: ReactNode;
};

export function PageHeader({ title, description, backHref, backLabel = "Back", actions }: Props) {
  return (
    <div className={`${ui.pageHeader} flex flex-wrap items-start justify-between gap-4`}>
      <div>
        {backHref ? (
          <Link href={backHref} className={`${ui.linkBack} mb-2 inline-block`}>
            ← {backLabel}
          </Link>
        ) : null}
        <h1 className={ui.pageTitle}>{title}</h1>
        {description ? <p className={ui.pageDesc}>{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
