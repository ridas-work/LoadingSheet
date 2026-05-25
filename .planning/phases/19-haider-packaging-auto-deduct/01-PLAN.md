---
wave: 1
depends_on: ["16-packaging-inventory/02-PLAN.md", "21-gate-guard-zaman/03-PLAN.md"]
gap_closure: false
files_modified:
  - "lib/roles.ts"
  - "lib/auth.ts"
  - "scripts/seed-users.ts"
  - "README.md"
  - "app/(app)/dispatch/layout.tsx"
  - "app/(app)/dispatch/inventory/page.tsx"
  - "app/(app)/dispatch/inventory/[code]/page.tsx"
  - "app/api/packaging-items/route.ts"
  - "app/api/packaging-items/[code]/route.ts"
  - "lib/packagingInventory.ts"
autonomous: true
---

<phase_goal>
Move packaging inventory responsibility from Rashid to **Haider** with a dedicated `packaging_editor` role, while keeping admin read-only visibility and avoiding accidental access to Rashid’s dispatch workflows.
</phase_goal>

<must_haves>
- [ ] Add app role **`packaging_editor`** for Haider.
- [ ] Seed user **Haider** with username `haider`, role `packaging_editor`, and an initial password documented in README.
- [ ] `homePathForRole("packaging_editor")` routes Haider directly to packaging inventory.
- [ ] Haider can view and edit packaging inventory APIs and UI.
- [ ] Admin can view packaging inventory read-only.
- [ ] Rashid (`dispatch_editor`) no longer owns packaging inventory editing in v1. If retaining temporary fallback access, document it explicitly and keep UI copy saying Haider is primary owner.
- [ ] `packaging_editor` must **not** gain access to dispatch trips, daily filling, gate delivery, production batches, PO creation, or admin pages.
- [ ] Navigation/copy says **Haider** maintains packaging stock; remove “Coming later” copy about deductions from the inventory page once Phase 19 plans execute.
</must_haves>

<tasks>
  <task id="1" name="role-and-seed">
    <step>Extend `AppRole`, allowed role list, `roleFromSession`, and home path handling with `packaging_editor`.</step>
    <step>Update auth/session role validation if role lists are duplicated outside `lib/roles.ts`.</step>
    <step>Add Haider to `scripts/seed-users.ts` defaults. Use password `Haider-Packaging-01` unless user provides another.</step>
    <step>Update README authorized-users table with Haider and his duty.</step>
  </task>

  <task id="2" name="route-access">
    <step>Add `canViewPackagingInventory` / `canEditPackagingInventory` helpers so packaging ownership is not tied to `canEditDispatch`.</step>
    <step>Update packaging item GET/PATCH APIs to use the new packaging access helpers.</step>
    <step>Adjust route guards so `packaging_editor` can reach only inventory pages. If the existing `/dispatch` layout would expose too much, add page-level guards on trip/filling pages or move inventory behind a new route with redirects.</step>
  </task>

  <task id="3" name="ui-copy">
    <step>Update `/dispatch/inventory` title/help text to say Haider maintains stock.</step>
    <step>Ensure read-only admin copy remains clear.</step>
    <step>Remove stale “Coming later” deduction message after plans 02/03 add delivery deduction.</step>
  </task>
</tasks>

<verification>
- `npm run build` passes.
- Login as Haider goes to packaging inventory and can edit a row.
- Haider cannot open `/dispatch/trips`, `/dispatch/filling`, `/gate/orders`, `/production/batches`, `/new-order`, or `/admin`.
- Rashid behavior for dispatch trips/filling remains unchanged.
- Admin can still view packaging inventory read-only.
</verification>
