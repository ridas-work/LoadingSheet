---
wave: 1
depends_on: []
gap_closure: false
files_modified:
  - "lib/adminOperationsReports.ts"
  - "lib/adminOperationsReports.types.ts"
autonomous: true
---

<phase_goal>
Pure **aggregation library** for Waleed operations reports — product bottle/carton totals, customer drill-down, product dispersion, batch usage, and grand totals — reusing existing sheet-line consumption and batch status helpers.
</phase_goal>

<user_stories>
- Waleed asks: “How many **Rhino 750 ml** bottles total?” → `buildProductTotalsReport()` returns bottles + cartons per catalog code.
- Waleed asks: “**Al Fatah** — all orders?” → `buildCustomerOrdersReport('al fatah')` returns PO list with line breakdown.
- Waleed asks: “Who got **Brighten**?” → `buildProductDispersionReport('brighten-liquid-laundry-detergent')` returns per-customer bottles.
- Waleed asks: “**Batch 260506-3** — where used?” → `buildBatchUsageReport()` includes PO links and liters.
</user_stories>

<must_haves>
- [ ] `lib/adminOperationsReports.types.ts` — DTOs: `ReportScope` (`all` | `delivered` | `pipeline`), `ProductTotalRow`, `CustomerOrderRow`, `DispersionRow`, `BatchUsageRow`, `GrandTotals`, `OperationsReportPayload`.
- [ ] `lib/adminOperationsReports.ts`:
  - `orderMatchesScope(order, scope)` — exclude `discardedAt`; delivered = `gateDeliveryStatus === 'delivered'`; pipeline = not delivered.
  - `sheetLinesForOrder(order)` — normalize to `DeductionSheetLine[]` (from `sheetLines` or synthesize from `items` / `customCartons` / `mixedSample` when empty).
  - `buildProductTotalsReport(orders, catalog, { scope, dateFrom?, dateTo? })` — uses `summarizePackagingConsumption` per order; aggregate by `productCode`; return bottles, cartons, orderCount.
  - `buildCustomerOrdersReport(orders, catalog, customerQuery, { scope })` — fuzzy match `customerName`; per-PO product breakdown + gate status + dates.
  - `buildProductDispersionReport(orders, catalog, productCode, { scope })` — per-customer bottles/cartons for one SKU.
  - `buildGrandTotalsReport(orders, catalog, { scope })` — total POs, total bottles (all products), total cartons, distinct customers.
  - `buildBatchUsageReport(batches, orders, catalog, usedMap)` — merge `usageForBatchNo` with PO scan for `batchNo` on sheet lines / `componentBatches`.
- [ ] Date filter: optional `dateFrom` / `dateTo` on `createdAt` (orders) or `gateDeliveredAt` when `scope === 'delivered'`.
- [ ] Unmapped product names collected in `unmapped: string[]` on product report (cap display at 20).
</must_haves>

<tasks>
  <task id="1" name="types-and-scope">
    <step>Define `ReportScope` and filter helpers; document loaded-sheet-first fallback in file header comment.</step>
  </task>

  <task id="2" name="sheet-line-normalizer">
    <step>`sheetLinesForOrder`: if `order.sheetLines?.length`, map to deduction lines; else build from `items` (boxes × bottlesPerBox as one row per item) and hybrid/custom/mixed helpers already in codebase (`buildSheetLines` pattern — import don’t copy).</step>
  </task>

  <task id="3" name="product-and-grand-totals">
    <step>Loop filtered orders → `summarizePackagingConsumption` → sum `productBottles` and `productCartons` maps.</step>
    <step>Join catalog for display name, `summaryLabel`, `litersPerBottle`.</step>
    <step>Sort by bottles descending.</step>
  </task>

  <task id="4" name="customer-and-dispersion">
    <step>Customer query: trim, lowercase, `includes` match on `customerName`.</step>
    <step>Dispersion: filter consumption to single `productCode`, group by customer.</step>
  </task>

  <task id="5" name="batch-usage">
    <step>For each batch, list PO numbers where `lineBatchAllocations` or `batchNo` / `componentBatches` references batch.</step>
    <step>Attach `usedLiters`, `remainingLiters`, `status` from `usageForBatchNo`.</step>
  </task>
</tasks>

<out_of_scope>
- API routes and UI (wave 2–3)
- CSV export
</out_of_scope>

<verification>
- Unit-style inline test in comments: 2 orders, 1 delivered with 10×10 Rhino 750 → 100 bottles.
- Discarded order excluded.
- `npm run build` passes (types only, no UI yet).
</verification>
