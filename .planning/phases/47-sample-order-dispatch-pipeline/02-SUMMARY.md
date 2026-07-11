# Plan 02 Summary — Waleed approve → sample order; remove request-time deduct

## What was built
- `app/api/admin/field-visit-samples/[id]/route.ts`: on **approve** of an outgoing sample, creates an `Order` via `buildSampleOrderFromVisit` (`orderKind: field_sample`, `approvalStatus: approved`), links it to the ticket (`sampleDispatchOrderId`, `linkedOrderId`, `linkedPoNumber`) and sets `sampleDispatchStatus: awaiting_batches`. Guards against duplicate orders. On **reject**, deletes the linked sample order if batches were not yet assigned.
- `app/api/field-visits/[id]/route.ts`: removed the `deductSampleProduction` block from `request_sample_approval` — stock no longer deducts at request time. Dropped now-unused import.
- `components/FieldVisitDetailForm.tsx`: step-1 copy now says stock deducts when Rashid assigns batches, not on request.

## Result
Requesting a sample no longer touches Esha's pool. Waleed approval produces a sample dispatch order. Build passes.
