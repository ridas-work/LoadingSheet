import Image from "next/image";
import type { ReactNode } from "react";

import {
  PORTAL_HERO_COPY,
  PORTAL_IMAGES,
  PORTAL_SHELL_CLASS,
  type PortalAccent,
} from "@/lib/portalTheme";

type Props = {
  accent: Exclude<PortalAccent, "signup">;
  children: ReactNode;
  /** When false, hides the side illustration (e.g. Rashid dispatch portal). */
  showArt?: boolean;
};

export function PortalShell({ accent, children, showArt = true }: Props) {
  const copy = PORTAL_HERO_COPY[accent];

  return (
    <div className={`portal-split ${PORTAL_SHELL_CLASS[accent]}${showArt ? "" : " portal-split-no-art"}`}>
      <div className="portal-split-work">
        <header className="portal-split-intro">
          <h2 className="portal-split-title">{copy.title}</h2>
          <p className="portal-split-subtitle">{copy.subtitle}</p>
        </header>
        <div className="portal-split-content">{children}</div>
      </div>

      {showArt ? (
        <aside
          className={`portal-split-art portal-split-art-${accent} print:hidden`}
          aria-label={copy.imageAlt}
        >
          <Image
            src={PORTAL_IMAGES[accent]}
            alt={copy.imageAlt}
            fill
            sizes="(min-width: 1024px) 30vw, 100vw"
            className="portal-split-image"
            priority
          />
        </aside>
      ) : null}
    </div>
  );
}
