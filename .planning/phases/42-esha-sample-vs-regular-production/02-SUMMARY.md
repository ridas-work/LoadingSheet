# Plan 02 Summary — Esha UI + production batches API

**Status:** Complete

## Delivered

- `POST/PATCH /api/production-batches` with `productionPurpose`
- `GET /api/production-batches?purpose=regular|sample|all` with `remainingSampleLiters`
- `/production/batches` — All / Regular / Sample tabs, purpose badges, sample remaining liters
- `ProductionBatchForm` — Regular vs Sample purpose selector with help text
- `/production/batches/new?purpose=sample` pre-selects sample purpose
- Edit page passes existing purpose to form

## Verification

- `npm run build` passes
