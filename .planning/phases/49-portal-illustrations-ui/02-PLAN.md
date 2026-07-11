---
wave: 2
depends_on: ["01"]
gap_closure: false
files_modified:
  - "app/(app)/dispatch/layout.tsx"
  - "app/(app)/production/layout.tsx"
  - "app/(app)/orders/layout.tsx"
  - "app/globals.css"
autonomous: true
---

<phase_goal>
Show the correct illustration hero at the top of **Rashid**, **Esha**, and **Ali** portals via nested layouts, with portal-scoped colorful shell accents.
</phase_goal>

<must_haves>
- [ ] **Rashid** (`isDispatchBatchOperator`, not admin-only clutter): `PortalHero` with truck image on all `/dispatch/*` pages when logged in as Rashid.
- [ ] **Esha** (`batch_editor`): girl / stock image on all `/production/*` pages.
- [ ] **Ali** (`isDispatchTripPlanner`, not admin): READY STOCK image on all `/orders/*` pages.
- [ ] **Admin** browsing these areas: no misleading hero (children only).
- [ ] Portal wrapper applies subtle accent gradient to page background (`portal-shell-*` classes).
</must_haves>

<tasks>
  <task id="T1" title="Dispatch layout — Rashid">
    <step>In `dispatch/layout.tsx`, after auth check, if `isDispatchBatchOperator(role, username) && role !== 'admin'`, wrap `children` with portal shell + `PortalHero` (rashid accent, truck image).</step>
    <step>Hero title example: "Dispatch & ready stock" — subtitle mentions batches, filling, trips.</step>
  </task>

  <task id="T2" title="Production layout — Esha">
    <step>In `production/layout.tsx`, if `role === 'batch_editor'`, wrap with Esha portal shell + hero (girl / Waleed Tech Stock art).</step>
    <step>Title example: "Production & chemical intake".</step>
  </task>

  <task id="T3" title="Orders layout — Ali">
    <step>In `orders/layout.tsx`, if `isDispatchTripPlanner(role, username) && role !== 'admin'`, wrap with Ali portal shell + READY STOCK hero.</step>
    <step>Title example: "Dispatch trips & orders".</step>
  </task>

  <task id="T4" title="Color polish">
    <step>Add `portal-shell-rashid|esha|ali` background gradients in `globals.css` (light, readable with existing cards).</step>
    <step>Ensure hero + shell do not reduce usable width below current `max-w-*` behavior.</step>
  </task>
</tasks>

<verification>
- Log in as Rashid → hero on `/dispatch/trips` and `/dispatch/filling`.
- Log in as Esha → hero on `/production/batches`.
- Log in as Ali → hero on `/orders`.
- Waleed admin → `/dispatch/trips` shows no Rashid-specific hero.
</verification>
