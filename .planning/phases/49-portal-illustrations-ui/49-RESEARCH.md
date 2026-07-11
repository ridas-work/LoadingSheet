# Phase 49 — Portal illustrations & colorful UI (research)

## Goal
Place four user-supplied vector illustrations in role-specific portals and refresh the frontend with a more colorful, welcoming layout — without breaking existing workflows or print views.

## Image → portal mapping (user confirmed)

| Asset (source) | Target portal | Role / route |
|----------------|---------------|--------------|
| Rejuvinitals truck in warehouse | **Rashid** | `dispatch_editor` (not Ali) — home `/dispatch/trips`, sub-routes under `/dispatch/*` |
| Girl at desk “Waleed Tech Stock” | **Esha** | `batch_editor` — home `/production/batches`, sub-routes under `/production/*` |
| “READY STOCK” warehouse + trucks | **Ali** | `dispatch_editor` username `ali` — home `/orders`, sub-routes under `/orders/*` |
| Waleed Tech logo composite | **Signup** | `/signup` (currently redirects to `/login`) |

Source files live under `assets/` (Cursor workspace storage paths). Copy into `public/images/portals/` with stable filenames for `next/image`.

## Current UI architecture

- **Global shell:** `app/(app)/layout.tsx` + `app/globals.css` + `lib/ui.ts` — brand blues, sticky dark header, `PageHeader` on list pages.
- **Role routing:** `lib/roles.ts` — `homePathForRole`, `isDispatchBatchOperator` (Rashid), `isDispatchTripPlanner` (Ali), `batch_editor` (Esha).
- **Nested layouts:** `dispatch/layout.tsx`, `production/layout.tsx`, `orders/layout.tsx` — auth guards only; no visual theming yet.
- **Auth pages:** `app/(auth)/login/page.tsx` — split panel (brand left, form right). `app/signup/page.tsx` and `app/register/page.tsx` redirect to `/login`.

## Recommended approach

### 1. Asset pipeline
Copy four PNGs to:
- `public/images/portals/rashid-dispatch-hero.png`
- `public/images/portals/esha-production-hero.png`
- `public/images/portals/ali-orders-hero.png`
- `public/images/portals/waleed-tech-signup.png`

Use `next/image` with `priority` on hero panels only (above-the-fold).

### 2. Reusable `PortalHero` component
Server-friendly component accepting:
- `imageSrc`, `imageAlt`, `title`, `subtitle?`, `accent` (`rashid` | `esha` | `ali`)
- Renders a rounded gradient banner above page content; illustration on the right (hidden on small screens or stacked).
- Does **not** replace `PageHeader` on every page — show once per **portal layout** so sub-pages stay compact.

### 3. Portal-specific layout wrappers
Inject hero in nested layouts (role-checked server components):

| Layout file | Condition | Hero |
|-------------|-----------|------|
| `app/(app)/dispatch/layout.tsx` | `isDispatchBatchOperator` | Rashid truck |
| `app/(app)/production/layout.tsx` | `role === batch_editor` | Esha girl |
| `app/(app)/orders/layout.tsx` | `isDispatchTripPlanner` | READY STOCK |

Admin viewing these routes still sees content without wrong hero (or neutral admin — prefer **no hero** when `role === admin` to avoid clutter).

### 4. Signup page
Replace redirect with a branded page mirroring login split:
- Left: Waleed Tech illustration + tagline
- Right: “Access is by invitation” copy + button to `/login` (no open registration unless product asks later)

Keep `/register` redirecting to `/signup` or `/login` consistently.

### 5. Color refresh (scoped, not global chaos)
Add portal accent CSS variables in `globals.css`:
- **Rashid:** lime / warehouse green accents on hero + subtle shell gradient
- **Esha:** warm pink / yellow accents
- **Ali:** orange / teal (matches READY STOCK art)

Apply via layout wrapper classes (`portal-shell-rashid`, etc.) on `main` or a portal wrapper — **do not** change header globally for all roles.

Optional polish (same phase):
- Softer card borders with accent tint on active portal
- Empty states with lighter accent background
- Nav active pill uses portal accent when inside that portal (client `AppNavLink` optional enhancement)

## Constraints

- **Print:** Loading sheets and carton labels must remain unchanged — hero hidden in `@media print` (header already hidden).
- **Performance:** One hero image per layout mount; use fixed `width`/`height` or `fill` in bounded container.
- **Accessibility:** Meaningful `alt` text per illustration; decorative gradients `aria-hidden`.
- **Mobile:** Hero stacks vertically; illustration max-height ~180px on small screens so tables remain reachable.

## Files likely touched

- `public/images/portals/*` (new)
- `components/PortalHero.tsx` (new)
- `app/(app)/dispatch/layout.tsx`, `production/layout.tsx`, `orders/layout.tsx`
- `app/signup/page.tsx`
- `app/globals.css`, optionally `lib/ui.ts`
- `app/register/page.tsx` (redirect target tweak)

## Verification

- Rashid login → `/dispatch/trips` shows truck hero; Ali login → `/orders` shows READY STOCK hero; Esha → `/production/batches` shows stock girl hero.
- `/signup` shows Waleed Tech art; links to login.
- `npm run build` passes.
- Print preview on loading sheet: no hero, header hidden.
