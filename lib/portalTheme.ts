export type PortalAccent = "rashid" | "esha" | "ali" | "signup";

export const PORTAL_IMAGES = {
  rashid: "/images/portals/rashid-dispatch-hero.png",
  esha: "/images/portals/esha-production-hero.png",
  ali: "/images/portals/ali-orders-hero.png",
  signup: "/images/portals/waleed-tech-signup.png",
} as const;

export const PORTAL_HERO_CLASS: Record<PortalAccent, string> = {
  rashid: "portal-hero-rashid",
  esha: "portal-hero-esha",
  ali: "portal-hero-ali",
  signup: "portal-hero-signup",
};

export const PORTAL_SHELL_CLASS: Record<Exclude<PortalAccent, "signup">, string> = {
  rashid: "portal-shell-rashid",
  esha: "portal-shell-esha",
  ali: "portal-shell-ali",
};

export const PORTAL_HERO_COPY: Record<
  Exclude<PortalAccent, "signup">,
  { title: string; subtitle: string; imageAlt: string }
> = {
  rashid: {
    title: "Dispatch & ready stock",
    subtitle: "Assign batches, record filling, and ship from factory-ready inventory.",
    imageAlt: "Delivery truck in warehouse with Rejuvinitals branding",
  },
  esha: {
    title: "Production & chemical intake",
    subtitle: "Manage batches, QC incoming chemicals, and track accessory stock.",
    imageAlt: "Illustration of stock management at Waleed Tech",
  },
  ali: {
    title: "Dispatch trips & orders",
    subtitle: "Plan vehicle trips, pick POs, and build loading sheets for the gate.",
    imageAlt: "Ready stock warehouse with delivery trucks",
  },
};
