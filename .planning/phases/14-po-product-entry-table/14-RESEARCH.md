# Phase 14 Research — PO product entry table

## User request

When **Nouman, Javeria, Aslam, or Ibtisam** create an order (PO number, customer, then products), they want a **table** so they can easily confirm they entered the **right products** and **right quantities** before saving.

## Current UI (`/new-order`)

- Header fields: PO, customer, city, deadline — OK.
- Products: **stacked cards** (one card per line) with product dropdown, cartons, bottles/carton, remove.
- Hard to scan when an order has **many SKUs** — each card repeats labels; no single grid view.

## Proposed UX (v1)

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│ PO / Customer / City / Deadline (unchanged)                  │
├─────────────────────────────────────────────────────────────┤
│ Products                          [ + Add product ]        │
│ ┌────┬──────────────────────┬─────────┬──────────┬───────┐ │
│ │ #  │ Product              │ Cartons │ Btl/carton│       │ │
│ ├────┼──────────────────────┼─────────┼──────────┼───────┤ │
│ │ 1  │ [dropdown + custom]  │ [input] │ [input]  │ Remove│ │
│ │ 2  │ …                    │ …       │ …        │       │ │
│ └────┴──────────────────────┴─────────┴──────────┴───────┘ │
│ Total cartons: 25          (only complete lines)           │
└─────────────────────────────────────────────────────────────┘
```

### Behaviour (keep existing logic)

- Catalog pick → auto-fill product name + default bottles/carton.
- **Other** → custom name field inline in Product column.
- **Custom bottles/carton** checkbox under product cell (or compact in row).
- Validation errors show **in-row** (red border / message under cell).
- Incomplete rows: muted styling until product + cartons valid.
- **+ Add product** appends a table row (same state model as today).

### Optional polish (in scope if quick)

- **Total cartons** in table footer (sum of valid lines).
- Horizontal scroll on small screens (`overflow-x-auto`).
- Empty state: one blank row by default (current behaviour).

## Out of scope (v1)

- Changing POST `/api/orders` payload or carton rules
- Editing existing orders from this table
- Duplicate-product warnings
- Excel import

## Files

| File | Change |
|------|--------|
| `components/NewOrderProductTable.tsx` | New — table UI + row editors |
| `app/(app)/new-order/page.tsx` | Use component; slimmer page |
| `README.md` | One line on table review for PO team |

## Verification

- PO creator adds 3 products → sees 3 rows in one table with correct names and carton counts.
- Submit still creates order with same `items[]` payload.
- `npm run build` passes.
