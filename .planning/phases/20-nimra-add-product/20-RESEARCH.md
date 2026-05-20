# Phase 20 — Research: Nimra add catalog product

## User request

In **Nimra’s portal** (production / batch area), add an **“Add product”** option so she can register **more products** when the factory prepares new SKUs — without waiting for a developer to edit `product-packings.json` and run seed.

## Current behavior

- `ProductPacking` lives in MongoDB; `data/product-packings.json` + `npm run seed:products` upserts rows.
- New order and batch family dropdown read from `/api/products` (catalog).
- Only **po_creator** creates orders; **batch_editor** (Nimra) registers batches against **existing** batch families from catalog.

## Recommended v1

### API

- `POST /api/product-packings` — role **`batch_editor` only** (same as Nimra’s batch APIs).
- Body: `code` (slug), `name`, `bottlesPerCarton`, `litersPerBottle` (optional — infer from name like seed), `batchFamily` (defaults to `name` if empty), optional `summaryLabel`, optional `aliases[]`.
- Reject duplicate `code`; validate numeric ranges; no `bundleComponents` in v1 (bundles stay seed-only or admin later).

### UI

- Button **Add product** on `/production/batches` header or `/production/batches/new` — opens modal or small form page.
- After save: toast + refresh product list in session (or redirect to new batch with product pre-selected).

### Out of scope v1

- Editing/deleting products Nimra added (admin or future phase).
- Bundles / multi-SKU rows.

## Dependencies

- Phase 08/10: ProductPacking model + batch families
- Phase 14: full-catalog grid consumes same API
