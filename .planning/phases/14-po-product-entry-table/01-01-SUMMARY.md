# Phase 14 / Plan 01 — Summary

**Plan:** `.planning/phases/14-po-product-entry-table/01-PLAN.md`
**Status:** ✅ Complete

## Goal
On `/new-order`, show **every catalog product in one list** and let the PO team enter only **carton counts** (and bottles/carton for samples). Only lines with cartons ≥ 1 are saved.

## What changed

### `components/NewOrderProductGrid.tsx` *(new)*
- Client component that renders the full catalog as a table:
  - **Product** (fixed name + default bottles/carton hint)
  - **Cartons** input (empty / 0 = excluded from order)
  - **Bottles / carton** (locked to catalog default until the row toggles **Sample / custom**)
  - **Sample / custom** toggle per row for non-standard packing (e.g. 1-bottle samples).
- Active rows (cartons ≥ 1) get an emerald highlight + emerald input border.
- Footer summary: **N products · N cartons total**.
- Optional **Add other product** button appends `OtherRow` entries for items not in the catalog (custom name + cartons + bottles/carton, with a per-row Remove).
- Pure presentational + state-via-callbacks; no API or DB changes here.

### `app/(app)/new-order/page.tsx` *(rewritten)*
- State refactored from `ItemRow[]` to:
  - `grid: Record<code, { cartons, bottlesPerBox, useDefaultPacking }>` — auto-seeded for every catalog product on load.
  - `otherRows: OtherRow[]` — empty by default.
- Validation: at least one row (catalog or other) with cartons ≥ 1 and bottles/carton ≥ 1. Per-cell errors keyed `item.<code>.<field>`.
- `buildSubmitItems()` filters the grid + other rows to `{ productName, boxes, bottlesPerBox }` for the existing `/api/orders` POST (no schema/API changes).
- Header copy + sub-helper text updated to describe the new entry style.

### `components/NewOrderProductTable.tsx` *(deleted)*
- Superseded by the grid. The old dynamic add/remove rows flow is gone.

### `README.md`
- PO-team workflow line rewritten: enter cartons next to products in the full list; samples via toggle; Other for catalog-misses.

## API / schema
None. The order POST body and `Order` schema are unchanged; the page just narrows what it sends.

## Verification
- `npm run build` passes (TypeScript clean, all 19 static routes generated).
- ReadLints clean on the two touched files.
- Submit behaviour unchanged for downstream pages (`/orders/<id>/loading-sheet`, admin summary, batch assignment).
