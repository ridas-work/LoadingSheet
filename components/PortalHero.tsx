import Image from "next/image";

import { PORTAL_HERO_CLASS, type PortalAccent } from "@/lib/portalTheme";

type Props = {
  accent: PortalAccent;
  imageSrc: string;
  imageAlt: string;
  title: string;
  subtitle?: string;
};

export function PortalHero({ accent, imageSrc, imageAlt, title, subtitle }: Props) {
  return (
    <section
      className={`portal-hero mb-6 print:hidden ${PORTAL_HERO_CLASS[accent]}`}
      aria-label={`${title} portal banner`}
    >
      <div className="portal-hero-inner">
        <div className="portal-hero-copy">
          <h2 className="portal-hero-title">{title}</h2>
          {subtitle ? <p className="portal-hero-subtitle">{subtitle}</p> : null}
        </div>
        <div className="portal-hero-art" aria-hidden={imageAlt ? undefined : true}>
          <Image
            src={imageSrc}
            alt={imageAlt}
            width={420}
            height={280}
            className="portal-hero-image"
            priority
          />
        </div>
      </div>
    </section>
  );
}
