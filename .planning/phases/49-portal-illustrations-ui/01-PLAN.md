---
wave: 1
depends_on: []
gap_closure: false
files_modified:
  - "public/images/portals/rashid-dispatch-hero.png"
  - "public/images/portals/esha-production-hero.png"
  - "public/images/portals/ali-orders-hero.png"
  - "public/images/portals/waleed-tech-signup.png"
  - "components/PortalHero.tsx"
  - "lib/portalTheme.ts"
autonomous: true
---

<phase_goal>
Copy the four vector illustrations into `public/` and build a reusable **`PortalHero`** banner component with per-portal accent styling.
</phase_goal>

<must_haves>
- [ ] Four PNGs in `public/images/portals/` with stable names (see RESEARCH.md).
- [ ] `lib/portalTheme.ts` exports accent keys (`rashid` | `esha` | `ali` | `signup`) and class maps for gradients.
- [ ] `PortalHero` accepts `accent`, `imageSrc`, `imageAlt`, `title`, optional `subtitle`; responsive layout; `print:hidden`.
- [ ] Uses `next/image` with explicit dimensions or bounded `fill` container.
</must_haves>

<tasks>
  <task id="T1" title="Copy assets">
    <step>Copy workspace `assets/*magnific*` PNGs into `public/images/portals/` per RESEARCH mapping.</step>
    <step>Verify files are committed-tracked (not left in `assets/` only).</step>
  </task>

  <task id="T2" title="Portal theme tokens">
    <step>Create `lib/portalTheme.ts` with accent metadata (title defaults, gradient class names).</step>
    <step>Add matching CSS utility classes in `globals.css` (`.portal-hero-rashid`, `.portal-hero-esha`, `.portal-hero-ali`, `.portal-hero-signup`).</step>
  </task>

  <task id="T3" title="PortalHero component">
    <step>Create `components/PortalHero.tsx` — gradient card, text left, image right, stacks on mobile.</step>
    <step>Include `className="print:hidden"` on root.</step>
  </task>
</tasks>

<verification>
- Import `PortalHero` in a throwaway page or Storybook-less smoke: renders without layout shift.
- `npm run build` passes.
</verification>
