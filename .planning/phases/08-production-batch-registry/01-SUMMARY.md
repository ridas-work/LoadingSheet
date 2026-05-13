# Plan 01 Summary — Production batch registry (Nimra)

**Status:** Complete  
**Wave:** 1

## Delivered

- **`ProductionBatch`** model + unique `batchNo`.
- **`GET/POST /api/production-batches`**, **`PATCH /api/production-batches/[id]`**.
- **`/production/batches`** registry list + **`/production/batches/new`** form.
- Removed Nimra **Edit batches** links from orders list.

## Verification

- `npm run build` — passed.
