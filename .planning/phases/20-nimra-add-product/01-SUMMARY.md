# Plan 01 — POST product packings — complete

## Delivered

- `lib/productPackingValidation.ts` — validates create body: name, slug `code`, integer `bottlesPerCarton` ≥ 1, optional `litersPerBottle` (else infer via `inferLitersPerBottleFromName`), optional `batchFamily` (defaults to trimmed `name`).
- `app/api/product-packings/route.ts` — `POST` for `batch_editor` only (403 others); 400 validation; 409 duplicate `code`; creates `ProductPacking` with `active: true`, empty `aliases` / `bundleComponents`, `summaryLabel` from name.

## Notes

- `GET /api/products` unchanged; catalog reads remain there.
