# Plan 01 Summary — Schema + sample stock lib

**Status:** Complete

## Delivered

- `ProductionBatch.productionPurpose` (`regular` | `sample`, default `regular`)
- `SampleProductionMovement` audit model for FIFO deductions
- `lib/sampleProductionStock.ts` — pool queries, `deductSampleProduction`, `regularProductionBatchMongoFilter`
- `FieldVisitTicket.sampleProducts[].bottles` field
- Regular-only filters on batch assignment API and loading sheet
- `GET /api/sample-production-stock` pool endpoint

## Verification

- Build passes
- Sample batches excluded from PO batch assignment paths
