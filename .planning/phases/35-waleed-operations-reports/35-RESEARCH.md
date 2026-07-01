# Phase 35 Research: Waleed operations reports hub

## User requirement

**Waleed (admin)** wants a **separate route** in the boss portal — a **complete report page** to answer operational questions in different aspects:

| Report | Example question |
|--------|------------------|
| **Product / bottle totals** | How many **Rhino 750 ml** bottles went out in total? |
| **Customer** | All orders for **Al Fatah** — PO list + products |
| **Product dispersion** | For one SKU, **which customers** got how many bottles/cartons |
| **Grand total** | Everything summed across products |
| **Batch-wise** | Per Nimra batch: liters used, remaining, linked POs |

Read-only oversight — same audience as `/admin`, `/admin/delivery-summary`. No editing.

## Existing building blocks (reuse, do not duplicate)

| Asset | Use for reports |
|-------|-----------------|
| `lib/packagingDeduction.ts` → `summarizePackagingConsumption` | Bottle + carton counts from **sheet lines** (standard, mixed sample, custom carton, bundles) |
| `lib/bottlesFromSheetLines.ts` | Thin wrapper → product bottle needs |
| `lib/adminOrderSummary.ts` | Carton grid per PO from **order items** (not sheet lines) |
| `lib/adminDeliverySummary.ts` | Delivered / pending / closed line lists |
| `lib/bundleCatalog.ts` → `lineBatchAllocations` | Liters per batch per sheet row |
| `lib/productionBatchStatus.ts` → `loadBatchUsageContext`, `usageForBatchNo` | Batch pool used / remaining |
| `lib/batchVolume.ts` → `productsMatch`, catalog matching | Resolve free-text / alias names to catalog |
| `canViewAdminSummary` in `lib/roles.ts` | Auth guard (Waleed admin + Nouman summary viewer) |

## What to count: sheet lines vs PO items

| Source | Meaning |
|--------|---------|
| **PO `items`** | What Nouman **ordered** (cartons × bottles/carton) |
| **`sheetLines`** | What Rashid **loaded** (after edits, mixed boxes, custom cartons) |

**Decision:** Default report numbers use **`sheetLines`** when present (truth for dispatch). Fall back to **`items`** only when an order has no sheet lines yet. Document this on the UI (“Loaded bottles” vs “Ordered” toggle in v2 — v1 loaded-first).

## Order inclusion filters

| Filter | Mongo / logic |
|--------|----------------|
| **All POs** | Not discarded (`discardedAt` null) |
| **Delivered only** | `gateDeliveryStatus === 'delivered'` |
| **In pipeline** | not delivered, not discarded |

Default v1: **All non-discarded** with sub-filter dropdown. Delivered-only is the common boss question for “how much went out”.

## Product identity

Reports must show **catalog packings** (Rhino 750ml, Brighten pouch, …) using `ProductPacking` + `resolveCatalogCode` pattern from `adminOrderSummary.ts`.

- **Mixed sample / custom carton** lines: explode via existing `summarizePackagingConsumption` (already attributes bottles to component products).
- **Bundles** on sheet: attribute to component SKUs per `bundleComponents`.
- Rows that cannot map → `"Unmapped"` bucket with raw `productName` list (small count).

## Customer report

- **Customer picker**: distinct `customerName` from orders (case-insensitive), typeahead search.
- **Drill-down**: list POs for customer with date, gate status, per-product bottle/carton totals, link to `/orders/{id}/loading-sheet`.

## Product dispersion

For selected product (catalog code or name):

```
Product: Rhino 750ml
─────────────────────────────────
Customer          Cartons  Bottles
Al Fatah               12      120
Rainbow Cash            8       80
…
─────────────────────────────────
Grand total            20      200
```

Built by scanning filtered orders’ sheet lines, grouping by `customerName`.

## Batch-wise report

Per `ProductionBatch`:

- batchNo, productName, totalLiters, usedLiters, remainingLiters, status (available / in-use / empty)
- **POs using batch**: scan orders’ `sheetLines` / `componentBatches` where `batchNo` matches (reuse `lineBatchAllocations` or batch usage map from `productionBatchStatus`)

Optional column: bottles implied from liters ÷ `litersPerBottle` when single-SKU batch.

## UI pattern (user direction — single page + filters)

**No tabs.** One **`/admin/reports`** overview page. Waleed uses **filters** on the same screen to drill into data — not separate Customer / Dispersion / Batches tabs.

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│ Operations reports                              [Print]      │
├─────────────────────────────────────────────────────────────┤
│ Filters (always visible):                                  │
│  Scope ▾   From [date]  To [date]                           │
│  Customer [search…]   Product ▾   Batch no [search…]        │
│  [Apply]  [Clear filters]                                    │
├─────────────────────────────────────────────────────────────┤
│ Summary cards: Orders | Customers | Cartons | Bottles        │
├─────────────────────────────────────────────────────────────┤
│ Results table (changes based on active filters — see below)  │
└─────────────────────────────────────────────────────────────┘
```

### Filter → result mapping

| Active filters | Result table |
|----------------|--------------|
| **None** (scope + dates only) | **Overview**: summary cards + full **products** table (all SKUs, grand total row) |
| **Customer** | That customer's **PO list** (PO no, date, status, products, cartons, bottles, link to loading sheet) |
| **Product** (no customer) | **Dispersion**: which customers received that SKU |
| **Customer + Product** | Customer PO list **filtered to that product** (or PO rows with product column highlighted) |
| **Batch** | **Batch bottles** table (filled / on POs / total per packing size) |
| **Batch + Product** | Batch table filtered to matching packing |

Cards always reflect the **current filter set** (e.g. customer filter → cards show that customer's totals only).

### Interaction

- All filter fields visible at once — not hidden per mode.
- **Apply** button (or debounced auto-fetch) refreshes cards + table.
- **Clear filters** resets to default overview (products table).
- Print hides filter chrome; prints cards + active result table.

Nav: **Reports** in admin header (unchanged).

## Out of scope (v1)

- CSV/Excel export
- Charts / graphs
- Real-time refresh / websockets
- Editing from reports
- Financial / pricing

## Risks

| Risk | Mitigation |
|------|------------|
| Large order volume slow aggregation | Server-side lib; single API per tab; lean `.select()` on Order |
| Name mismatch (Rhino vs RHINO 750) | Centralize on catalog `code` + existing matchers |
| Orders without sheet lines | Fallback to items; show badge “ordered only” on row |

## File layout (proposed)

```
lib/adminOperationsReports.ts      # core aggregations
lib/adminOperationsReports.types.ts # shared DTOs (optional)
app/api/admin/reports/route.ts      # query params: view, scope, customer, productCode, dates
app/(app)/admin/reports/page.tsx
components/AdminReportsHub.tsx
```

## Verification scenarios

1. Delivered PO with 10× Rhino 750ml cartons → product report shows **100 bottles** for `rhino-750ml`.
2. Customer “AL FATAH” search → lists all their POs with correct totals.
3. Batch `260506-3` on sheet lines → batch tab shows used liters + PO numbers.
4. Grand total = sum of product table bottles.
5. Discarded PO excluded from all reports.
6. `npm run build` passes; non-admin gets 403.
