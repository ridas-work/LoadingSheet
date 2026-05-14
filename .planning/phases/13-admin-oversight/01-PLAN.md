---
wave: 1
depends_on: ["12-admin-pending-summary/02-PLAN.md"]
gap_closure: false
files_modified:
  - "lib/roles.ts"
  - "app/(app)/orders/layout.tsx"
  - "app/(app)/new-order/layout.tsx"
  - "app/(app)/dispatch/layout.tsx"
  - "app/(app)/production/batches/new/page.tsx"
  - "app/(app)/production/batches/[id]/edit/page.tsx"
  - "app/api/orders/route.ts"
autonomous: true
---

<phase_goal>
**Waleed Intisar** (`admin`) can **browse** operational routes read-only: orders, production batches, dispatch trips — without being redirected away or hitting forbidden GET APIs.
</phase_goal>

<must_haves>
- [ ] `lib/roles.ts` — `isAdmin()`, `adminCanViewOperations()` (or equivalent) used by layouts.
- [ ] Admin **not** redirected from `/orders` or `/production/batches`.
- [ ] Admin **allowed** on `/dispatch/trips` (read-only path).
- [ ] Admin **blocked** from `/new-order`, `/production/batches/new`, batch edit pages (redirect to safe home).
- [ ] POST `/api/orders` remains `po_creator` only; batch/dispatch mutations unchanged.
</must_haves>

<tasks>
  <task id="1" name="role-helpers">
    <step>Add `isAdmin` and read-only oversight helpers to `lib/roles.ts`.</step>
    <step>Use in layouts instead of hard-coded redirect lists.</step>
  </task>

  <task id="2" name="layout-guards">
    <step>Remove admin redirect from `orders/layout.tsx`.</step>
    <step>`new-order/layout.tsx`: redirect admin → `/orders` (or `/admin`).</step>
    <step>`dispatch/layout.tsx`: allow `admin` alongside `dispatch_editor`.</step>
    <step>Guard batch **new** and **edit** pages: admin → `/production/batches`.</step>
  </task>

  <task id="3" name="api-audit">
    <step>Confirm GET list/detail APIs work for admin; document any PATCH that must stay forbidden.</step>
  </task>
</tasks>

<verification>
- Waleed can open `/orders`, `/production/batches`, `/dispatch/trips` without redirect.
- Waleed cannot open `/new-order` or batch create/edit.
- `npm run build` passes.
</verification>
