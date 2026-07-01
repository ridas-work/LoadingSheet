---
wave: 3
depends_on: ["35-waleed-operations-reports/02-PLAN.md"]
gap_closure: false
files_modified:
  - "app/(app)/admin/reports/page.tsx"
  - "components/AdminReportsHub.tsx"
  - "app/(app)/layout.tsx"
  - "app/(app)/admin/page.tsx"
autonomous: true
---

<phase_goal>
**Waleed portal route `/admin/reports`** — **single overview page** with a unified filter bar. No tabs. Filters (scope, dates, customer, product, batch) drive which result table appears below summary cards. Print-friendly. Nav link **Reports** in admin header.
</phase_goal>

<user_flow>
1. Waleed opens **Reports** from admin nav → `/admin/reports`.
2. **Default view** (no customer / product / batch filters): summary cards + **full products table** (name, cartons, bottles, orders) with grand total footer.
3. **Customer filter** → same page; cards scoped to that customer; table switches to **their PO list** (PO no, date, status, products, cartons, bottles, loading-sheet link).
4. **Product filter** (no customer) → cards scoped to that SKU; table shows **dispersion** (customer × cartons × bottles).
5. **Customer + Product** → customer PO list filtered to rows containing that product.
6. **Batch filter** → batch bottles table (filled / on POs / total per packing); optional product filter narrows rows.
7. Toolbar always shows: **Scope**, **From–To** dates, **Customer** search, **Product** dropdown, **Batch no** search, **Apply**, **Clear filters**, **Print**.
</user_flow>

<must_haves>
- [ ] `app/(app)/admin/reports/page.tsx` — server page; `canViewAdminSummary` guard; render `AdminReportsHub`.
- [ ] `components/AdminReportsHub.tsx` — client component:
  - **No tab buttons** — remove overview/products/customers/dispersion/batches tab UI
  - Single filter state: `scope`, `dateFrom`, `dateTo`, `customer`, `productCode`, `batch`
  - `resolveReportView(filters)` → API `view` param:
    - `batch` set → `batches`
    - `customer` + `productCode` → `customers` with both params (API filters PO product breakdown)
    - `customer` only → `customers`
    - `productCode` only → `dispersion`
    - else → `products` (full table; cards from `overview` or `products.grandTotals`)
  - **Apply** triggers fetch; **Clear filters** resets drill-down fields
  - Summary cards always visible above result table
  - Loading / error states; `toLocaleString` formatting
- [ ] **Products** table: name, cartons, bottles, orders; grand total row.
- [ ] **Customers**: typeahead + datalist; PO rows with loading-sheet links.
- [ ] **Dispersion**: per-customer breakdown with footer total.
- [ ] **Batches**: batch no links to `/production/batches/{id}` when available.
- [ ] `app/(app)/layout.tsx` — admin nav: **Reports** link (if not already present).
- [ ] Optional: card on `/admin` linking to Reports.
- [ ] Print: `print:hidden` on filters; cards + table print cleanly.
</must_haves>

<tasks>
  <task id="1" name="remove-tabs-add-filters">
    <step>Refactor `AdminReportsHub`: remove `ReportTab` state and tab button row.</step>
    <step>Show all filter fields in one toolbar (customer, product, batch always visible).</step>
    <step>Add Apply + Clear filters buttons.</step>
  </task>

  <task id="2" name="filter-driven-fetch">
    <step>Implement `resolveReportView()` and map filters to API query params.</step>
    <step>On Apply: fetch appropriate `view`; update cards from `grandTotals` in response.</step>
    <step>Default load: `view=products` (or `overview` for cards + merge products fetch).</step>
  </task>

  <task id="3" name="result-panels">
    <step>Single result area renders one table type based on active filters (no tab switch).</step>
    <step>Customer+product: pass both params; show filtered PO list.</step>
    <step>Empty states per mode (“Search customer…”, “Select product…”, etc.).</step>
  </task>

  <task id="4" name="nav-and-print">
    <step>Ensure Reports nav link and admin shortcut exist.</step>
    <step>Verify print preview hides filter chrome.</step>
  </task>
</tasks>

<out_of_scope>
- CSV download
- Charts
- Separate routes per report type
</out_of_scope>

<verification>
- Waleed logs in → **Reports** → single page, no tabs visible.
- Default: cards + full products table.
- Customer “Al Fatah” + Apply → PO list for that customer on same page.
- Product “Rhino 750ml” + Apply → dispersion table on same page.
- Batch filter → batch bottles table on same page.
- Clear filters → back to default products overview.
- Print preview shows cards + table without filter bar.
- `npm run build` passes.
</verification>
