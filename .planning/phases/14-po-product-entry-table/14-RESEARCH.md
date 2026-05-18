# Phase 14 Research — PO full-catalog quantity grid

## User request (revised)

PO team (**Nouman, Javeria, Aslam, Ibtisam**) find **add-product + dropdown** flow difficult. They want:

1. **One fixed list** of all products (~15–17 catalog SKUs) visible at once.
2. They only type **how many cartons** (and bottles/carton when needed) per product.
3. A typical order uses **3–4 products** — most rows stay **empty / zero**.
4. On save, **only products with carton count > 0** become order lines → loading sheet rows.

Like a **spreadsheet checklist**: scan the full list, fill quantities where needed, submit.

## Why this is better than “add product” rows

| Old flow | New flow |
|----------|----------|
| Pick product from dropdown per line | Product name already shown for every SKU |
| Add/remove rows | All rows always visible |
| Easy to forget a line or pick wrong SKU | Only type numbers in known rows |
| Hard to compare totals | Footer: “N products · M cartons” |

## Catalog (17 active SKUs)

From `data/product-packings.json`: Brighten (2 + bundle), Fabrito (2), Power Wash (2 + bundle), Rhino (4), Titan, Degrease, Washout (3), bundles, etc.

Each row in the grid = one catalog `ProductPacking` (including bundles as their own row).

## Proposed UX

```
┌──────────────────────────────────────────────────────────────┐
│ PO number · Customer · City · Deadline                        │
├──────────────────────────────────────────────────────────────┤
│ Enter cartons for each product (leave blank = not on order)   │
│ ┌────────────────────────────┬─────────┬──────────┬─────────┐ │
│ │ Product                    │ Cartons │ Btl/ctn  │         │ │
│ ├────────────────────────────┼─────────┼──────────┼─────────┤ │
│ │ Rhino 750ml                │ [  10 ] │ 10       │ (sample)│ │
│ │ Power Wash                 │ [   0 ] │ 10       │         │ │
│ │ … (all 17 products)        │         │          │         │ │
│ ├────────────────────────────┴─────────┴──────────┴─────────┤ │
│ │ Optional: Other product    │ [  ]    │ [  ]     │ name    │ │
│ └────────────────────────────────────────────────────────────┘ │
│ 3 products · 25 cartons on this order                          │
└──────────────────────────────────────────────────────────────┘
```

### Row behaviour

- **Cartons**: empty or `0` = not on order; integer ≥ 1 = included.
- **Bottles/carton**: default from catalog (read-only); **“Sample”** or checkbox toggles editable `1` for that row only.
- Rows with cartons > 0: light highlight (e.g. green/zinc) so the 3–4 active lines stand out.
- **Other** (optional v1): one extra row at bottom for custom product name + cartons (keeps today’s fallback).

### Submit

Build `items[]` from rows where `cartons >= 1`:

```json
{ "productName": "Rhino 750ml", "boxes": 10, "bottlesPerBox": 10 }
```

Same POST `/api/orders` — no API change. `buildSheetLines` still creates one loading-sheet row per carton.

### Validation

- At least **one** line with cartons ≥ 1.
- PO + customer required (unchanged).
- Per-row: if cartons > 0, bottles/carton must be integer ≥ 1.

## Out of scope (v1)

- Changing admin summary columns (still maps by product name)
- Editing existing orders with this grid
- Hiding unused catalog products (user wants full list visible)

## Files

| File | Change |
|------|--------|
| `components/NewOrderProductGrid.tsx` | New — full catalog grid (replace partial `NewOrderProductTable.tsx`) |
| `app/(app)/new-order/page.tsx` | Grid state keyed by catalog `code`; submit filters qty > 0 |
| `README.md` | PO team: full product list, enter cartons only |

## Supersedes

Earlier Phase 14 idea (“add product” table with dynamic rows) — **replaced** by this full-catalog grid.
