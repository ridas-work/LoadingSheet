---
wave: 4
depends_on: ["35-waleed-operations-reports/03-PLAN.md"]
gap_closure: true
files_modified:
  - "components/AdminReportsHub.tsx"
  - "app/api/admin/reports/route.ts"
  - "lib/adminOperationsReports.ts"
autonomous: true
---

<phase_goal>
**Gap closure** — refactor existing tabbed `/admin/reports` UI to match user direction: **one overview page, filter-driven results** (no Customer / Dispersion / Batches tabs).
</phase_goal>

<context>
Implementation currently ships with 5 tabs (`overview`, `products`, `customers`, `dispersion`, `batches`). User wants a single page where all filters are always visible and the result table changes based on filter values.
</context>

<must_haves>
- [ ] Remove tab button row from `AdminReportsHub.tsx`.
- [ ] All filters visible in one toolbar: scope, dates, customer, product, batch.
- [ ] Apply / Clear filters buttons; fetch on Apply (not on tab change).
- [ ] Summary cards always shown; scoped to active filters via API `grandTotals`.
- [ ] `view=customers` + `productCode` supported when both filters set.
- [ ] Default page load: products table + cards (no drill-down filters).
- [ ] `npm run build` passes; no regression on existing report data accuracy.
</must_haves>

<tasks>
  <task id="1" name="refactor-hub">
    <step>Replace tab state with filter state + `resolveReportView()`.</step>
    <step>Unify conditional filter UI into always-visible toolbar.</step>
  </task>

  <task id="2" name="api-customer-product">
    <step>If missing: extend customer report builder to accept optional `productCode` filter.</step>
  </task>

  <task id="3" name="verify-ux">
    <step>Manual spot-check: default overview, customer drill-down, product dispersion, batch filter, clear filters.</step>
  </task>
</tasks>

<verification>
- No tab UI remains on `/admin/reports`.
- Filter combinations from 03-PLAN user_flow all work on one page.
- `npm run build` passes.
</verification>
