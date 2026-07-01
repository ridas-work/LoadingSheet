---
wave: 2
depends_on: ["35-waleed-operations-reports/01-PLAN.md"]
gap_closure: false
files_modified:
  - "app/api/admin/reports/route.ts"
  - "lib/roles.ts"
autonomous: true
---

<phase_goal>
**Admin-only API** exposing operations reports. Query params support a **filter-driven single-page UI** — client picks `view` from active filters; server returns scoped data + `grandTotals` for summary cards.
</phase_goal>

<must_haves>
- [ ] `GET /api/admin/reports` — auth: `canViewAdminSummary(role, username)` (Waleed + Nouman summary).
- [ ] Query params:
  - `view` — `overview` | `products` | `customers` | `dispersion` | `batches` (client derives from filters; default `products` for unfiltered page)
  - `scope` — `all` | `delivered` | `pipeline` (default `all`)
  - `customer` — optional; required for customer drill-down
  - `productCode` — optional; required for dispersion; when combined with `customer`, filter customer PO breakdown to that SKU
  - `batch` — optional batch no filter for `view=batches`
  - `dateFrom`, `dateTo` — optional ISO dates `YYYY-MM-DD`
- [ ] Every response includes `grandTotals` (or equivalent) so summary cards work on all filter modes.
- [ ] Load data once per request:
  - `Order.find({}).select({ poNumber, customerName, createdAt, gateDeliveryStatus, gateDeliveredAt, discardedAt, items, sheetLines, orderKind, mixedSample, customCartons, subtractedItems }).lean()`
  - `ProductPacking.find({ active: true })` for catalog
  - `ProductionBatch` + filling entries when `view=batches`
- [ ] Response shape per view:
  - `overview` → `{ grandTotals, topProducts, customerNames? }`
  - `products` → `{ products, unmapped, grandTotals, customerNames? }`
  - `customers` → `{ customerQuery, orders, grandTotals, customerNames }` — when `productCode` also set, filter order product breakdown
  - `dispersion` → `{ productCode, productName, rows, totals, grandTotals }`
  - `batches` → `{ rows, totals, grandTotals, batchNumbers? }`
- [ ] `customerNames` list (capped ~500) included in `products` or `overview` for typeahead datalist.
- [ ] 400 when required params missing for view; 403 for non-admin.
</must_haves>

<tasks>
  <task id="1" name="route-handler">
    <step>Ensure `app/api/admin/reports/route.ts` supports all views and filter combinations.</step>
    <step>When `view=customers` + `productCode`: filter each PO's product breakdown to that SKU; recalc row cartons/bottles.</step>
  </task>

  <task id="2" name="grand-totals-everywhere">
    <step>Return `grandTotals` scoped to active filters in every view response (for summary cards).</step>
  </task>

  <task id="3" name="customer-and-batch-lists">
    <step>Include `customerNames` and `batchNumbers` for datalist suggestions on unfiltered / batch views.</step>
  </task>
</tasks>

<out_of_scope>
- UI (wave 3)
- Caching / pagination
</out_of_scope>

<verification>
- `?view=products&scope=delivered` → products array + grandTotals.
- `?view=customers&customer=al%20fatah` → orders + grandTotals for that customer.
- `?view=customers&customer=al%20fatah&productCode=rhino-750ml` → filtered PO rows.
- `?view=dispersion&productCode=rhino-750ml` → customer rows + totals.
- `?view=batches&batch=260506` → filtered batch rows.
- Non-admin → 403; `npm run build` passes.
</verification>
