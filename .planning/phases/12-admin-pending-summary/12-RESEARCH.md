# Phase 12 Research — Admin pending orders summary

## Source: boss PDF (`summery.pdf`)

The boss uses a **spreadsheet-style pending orders report** with:

### Row fields (per PO / customer)
| Column | Example |
|--------|---------|
| Sr | 1, 2, 3… |
| Customer name | RAINBOW, CSD RWP, CARREFOUR FORTRESS |
| City | LAHORE, RAWALPINDI, PESHAWAR |
| Deadline date | `11/5/2026`, `23-5-2026` |
| Order / PO no | `11489247`, `26190930001041` |
| Status override | `BUILTY DONE` (replaces deadline when dispatched) |

### Product columns (carton counts per SKU)
Each column is a product line; cell = **number of cartons** on that PO.

Examples from PDF headers:
- Washout variants (Lemon / Floral / Ocean) — catalog currently has single **Washouts**
- Rhino 750 / 500 / 250 / Set (2x2)
- Brighten bottle, pouch, 3L, Brighten+Fabrito bundle
- Fabrito bottle, pouch
- Power Wash, Power Wash pouch, Power Wash+Degrease bundle
- Degrease Spray, Titan

### Footer
- **Per-column totals** across all pending rows
- **Row TOTAL** (sum of cartons on that PO)
- **Grand total** cartons (PDF shows 1054)
- Title: **PENDING ORDERS** + report date

## Gap vs current app

| PDF needs | App today |
|-----------|-----------|
| City | Not on `Order` |
| Deadline date | Not on `Order` |
| Product pivot columns | Orders have `items[]` but no boss grid |
| BUILTY DONE | No derived status; use dispatch trip + vehicle |
| Admin login | No `admin` role |

## Proposed `admin` role

- New role: **`admin`** (management read-only dashboard)
- Seed user **Waleed Intisar** — username `waleed`, password `Waleed-Admin-01` (document in README)
- Home: **`/admin`**
- Cannot create POs, batches, or dispatch — **view summary only**

## Pending vs BUILTY DONE

| State | Rule (v1) |
|-------|-------------|
| **Pending** | Shown in main grid |
| **BUILTY DONE** | `dispatchTripId` set **and** `dispatch.vehicleNo` non-empty — show in list with label instead of deadline, or separate section |

Optional v1: only show **pending** rows in grid; link to “completed” count.

## Product → column mapping

Add optional **`summaryLabel`** on `ProductPacking` (seed JSON) — short header for admin grid (e.g. `POWER WASH POUCH`). Fallback: truncate `name`.

Aggregate cartons from `order.items[]` by matching product name to catalog code.

## UI approach

- Route: `/admin` (and `/admin/layout.tsx` guard)
- Wide **horizontal-scroll table** matching PDF layout
- **Print** button (reuse print patterns from loading sheet)
- API: `GET /api/admin/summary?date=` — returns columns, rows, columnTotals, grandTotal

## PO entry extension

Add **City** and **Deadline** to new-order form so future POs populate the boss report. Existing orders: blank city/deadline until edited (optional backfill out of scope).

## Out of scope (v1)

- Excel export
- Editing orders from admin
- Washout Lemon/Floral/Ocean as separate catalog SKUs (until added, all Washouts → one column)
- User management UI
