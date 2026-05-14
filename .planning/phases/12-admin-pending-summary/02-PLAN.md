---
wave: 2
depends_on: ["12-admin-pending-summary/01-PLAN.md"]
gap_closure: false
files_modified:
  - "lib/adminOrderSummary.ts"
  - "app/api/admin/summary/route.ts"
  - "app/(app)/admin/page.tsx"
  - "app/(app)/layout.tsx"
  - "README.md"
autonomous: true
---

<phase_goal>
Boss **admin dashboard**: spreadsheet-style **PENDING ORDERS** summary matching the PDF — customer, city, deadline / BUILTY DONE, PO no, product carton columns, row totals, column totals, grand total. Print-friendly.
</phase_goal>

<user_flow>
1. Boss logs in → **`/admin`**.
2. Sees title **Pending orders** + today’s date.
3. Table: one row per open PO; product columns from catalog `summaryLabel`; **Total** column.
4. Rows with vehicle dispatched show **BUILTY DONE** in deadline cell.
5. Footer row: per-product totals + **grand total** cartons.
6. **Print** for desk review (optional filter: pending-only vs include done).
</user_flow>

<must_haves>
- [ ] `lib/adminOrderSummary.ts` — build rows, columns, totals from orders + catalog.
- [ ] `GET /api/admin/summary` — `admin` only; returns grid JSON.
- [ ] `/admin` page — horizontal-scroll table, matches PDF structure closely.
- [ ] Print stylesheet or print button.
- [ ] Nav: admin sees **Summary** only (no PO/batch/dispatch links).
- [ ] README: boss credentials + workflow bullet.
</must_haves>

<tasks>
  <task id="1" name="summary-engine">
    <step>Map each order item to catalog column via product name match.</step>
    <step>Compute row total, column totals, grand total (cartons = `items.boxes`).</step>
    <step>`builtyDone` when on dispatch trip with vehicle no.</step>
  </task>

  <task id="2" name="api">
    <step>`GET /api/admin/summary` with auth guard.</step>
  </task>

  <task id="3" name="ui">
    <step>Admin dashboard page + `AdminSummaryTable` component.</step>
    <step>Update app layout nav for admin role.</step>
    <step>README boss section.</step>
  </task>
</tasks>

<out_of_scope>
- CSV/Excel download
- Admin editing orders
- Charts / analytics beyond the grid
</out_of_scope>

<verification>
- With sample POs, grid shows correct carton counts per product column.
- Dispatched PO shows BUILTY DONE.
- Column totals match sum of rows.
- `npm run build` passes.
</verification>
