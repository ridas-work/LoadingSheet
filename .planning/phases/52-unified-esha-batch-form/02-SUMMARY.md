# Plan 02 Summary — Single product dropdown & combined form

**Status:** Complete

## Delivered

- `GET /api/products` — returns `unifiedBatchProducts` with `dispatch` / `custom` groups
- `ProductionBatchForm.tsx` — removed Batch type toggle; optgroup product dropdown; unified QC fields; optional drum for custom products; customer always optional

## Verification

- `npm run build` passes
