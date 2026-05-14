---
wave: 2
depends_on: ["13-admin-oversight/01-PLAN.md"]
gap_closure: false
files_modified:
  - "app/(app)/layout.tsx"
  - "app/(app)/orders/page.tsx"
  - "components/OrdersListWithTrips.tsx"
  - "app/(app)/dispatch/trips/page.tsx"
  - "app/(app)/dispatch/trips/[id]/page.tsx"
  - "app/(app)/admin/page.tsx"
  - "README.md"
autonomous: true
---

<phase_goal>
Boss **oversight UI**: nav across the app, **Entered by** on orders, read-only Nimra batch visibility, read-only dispatch trips — while keeping the **pending orders summary** at `/admin`.
</phase_goal>

<must_haves>
- [ ] Admin nav: **Summary**, **Orders**, **Production batches**, **Dispatch trips**.
- [ ] Orders list shows **Entered by** (`createdByName`) for each PO.
- [ ] Production batch list/detail: admin sees Nimra’s QC data; **no** Add/Edit/Delete actions.
- [ ] Dispatch trips: admin can list and open trips; **no** create trip / assign batches / edit dispatch buttons.
- [ ] `/admin` retains pending-orders summary; optional short oversight intro/links.
- [ ] README: Waleed oversight capabilities documented.
</must_haves>

<tasks>
  <task id="1" name="nav">
    <step>Update `app/(app)/layout.tsx` admin header links.</step>
  </task>

  <task id="2" name="orders-creator">
    <step>Select `createdByName` on orders query.</step>
    <step>`OrdersListWithTrips`: **Entered by** column (show when admin or always).</step>
  </task>

  <task id="3" name="dispatch-readonly">
    <step>Dispatch trips list + detail: hide mutate actions when `isAdmin`.</step>
    <step>Loading sheet links remain view-only for admin.</step>
  </task>

  <task id="4" name="admin-home">
    <step>Keep `AdminSummaryDashboard`; add brief oversight copy or quick links to Orders / Batches / Trips.</step>
    <step>README boss section updated.</step>
  </task>
</tasks>

<out_of_scope>
- Admin creating or editing POs, batches, or dispatch
- Activity log / notifications
</out_of_scope>

<verification>
- Waleed sees who entered each PO on `/orders`.
- Waleed opens a Nimra batch detail and sees QC + “Registered by”.
- Waleed opens dispatch trips without edit controls.
- `npm run build` passes.
</verification>
