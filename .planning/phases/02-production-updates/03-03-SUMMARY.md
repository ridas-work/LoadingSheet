---
phase: "02"
plan: "03"
subsystem: "product-packing-catalog"
completed: "2026-05-12"
---

# Plan 03 Summary — Product packing catalog

## Shipped

- **`ProductPacking`** model (`code`, `name`, `bottlesPerCarton`, `active`, `aliases`).
- **`GET /api/products`** — active products sorted by name.
- **`data/product-packings.json`** — 15 SKUs from stakeholder list (bundle name normalized for display).
- **`npm run seed:products`** — upserts from JSON or `SEED_PRODUCTS_JSON`.
- **New Order** — product `<select>` with default bottles/carton; **“Custom bottles per carton”** checkbox for samples; **Other (type name)** for off-catalog lines.

## Verification

- `npm run build` passes.

## Ops

Run once per environment (or after editing JSON):

```bash
npm run seed:products
```
