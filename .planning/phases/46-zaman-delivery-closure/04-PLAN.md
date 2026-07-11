---
wave: 2
depends_on: ["01-PLAN.md"]
gap_closure: false
files_modified:
  - "lib/adminDeliverySummary.ts"
  - "app/api/admin/delivery-summary/route.ts"
  - "components/AdminReportsHub.tsx"
  - "app/(app)/admin/delivery-summary/page.tsx"
autonomous: true
---

<phase_goal>
Management sees a **delivery closure table**: PO | product | delivered | damaged | returned — filterable by date and PO.
</phase_goal>

<must_haves>
- [ ] `lib/adminDeliverySummary.ts` exports rows from orders with `deliveryClosureLines` (legacy full deliveries show delivered = dispatched, damaged/returned = 0).
- [ ] API returns flat rows: `poNumber`, `customerName`, `productName`, `deliveredBottles`, `damagedBottles`, `returnedBottles`, `closedAt`, `deliveryOutcome`.
- [ ] Admin delivery summary page (or Reports hub tab) renders sortable table with PO-level subtotals optional.
- [ ] CSV/export optional if Reports hub already has export pattern — reuse if trivial.
</must_haves>

<tasks>
  <task id="T1" title="Summary aggregation">
    <step>Extend `adminDeliverySummary` to query closed/delivered orders with closure lines.</step>
    <step>For legacy orders without `deliveryClosureLines`, synthesize one row per product from `sheetLines` + `deliveryOutcome: full`.</step>
  </task>

  <task id="T2" title="API + UI table">
    <step>Update `app/api/admin/delivery-summary/route.ts` to include closure columns.</step>
    <step>Add table to `AdminReportsHub` or enhance `/admin/delivery-summary` with columns: **PO | Product | Delivered | Damaged | Returned**.</step>
    <step>Show `deliveryOutcome` badge (Full / Partial) per PO group.</step>
  </task>
</tasks>

<verification>
- After a partial close in UAT, row appears with correct delivered/damaged/returned counts.
- Full closes show dispatched qty in Delivered column, zeros in Damaged/Returned.
- `npm run build` passes.
</verification>
