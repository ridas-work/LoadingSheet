# Plan 02 Summary — Close API + guards

**Status:** Complete

## Delivered
- `POST /api/production-batches/[id]/close` — waste + confirm → close
- PATCH production-batches and qc-status block closed batches (403)
- `serializeProductionBatch` includes closure fields
