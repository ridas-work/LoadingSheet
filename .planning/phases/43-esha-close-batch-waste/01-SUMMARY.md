# Plan 01 Summary — Closure schema + pool filters

**Status:** Complete

## Delivered
- `ProductionBatch` closure fields (`closedAt`, waste, snapshots, actor)
- `lib/productionBatchClose.ts` — open/closed filters, `validateBatchClose`
- `regularProductionBatchMongoFilter` / `sampleProductionBatchMongoFilter` exclude closed
- `usageForProductionBatch` — closed batches show 0 remaining for assignment
