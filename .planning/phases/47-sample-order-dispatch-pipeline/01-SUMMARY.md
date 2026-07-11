# Plan 01 Summary — Schema + builders + filters

## What was built
- `Order`: added `field_sample` to `orderKind` enum; added `fieldVisitTicketId`, `sampleRepName`, `sampleStockDeductedAt`.
- `DispatchTrip`: added `tripKind` enum (`regular` default / `sample`).
- `FieldVisitTicket`: added `sampleDispatchOrderId` + `sampleDispatchStatus` (`none`/`awaiting_batches`/`batched`/`dispatched`).
- `lib/sampleDispatch.ts` (new): `FIELD_SAMPLE_ORDER_KIND`, `SAMPLE_TRIP_KIND`, `isFieldSampleOrder`, `isSampleTrip`, and mongo filters `regularOrdersMongoFilter`, `sampleOrdersMongoFilter`, `regularTripsMongoFilter`, `sampleTripsMongoFilter`, `readySampleOrdersMongoFilter`.
- `lib/sampleOrderFromVisit.ts` (new): `buildSampleOrderFromVisit`, `sampleOrderPoNumber` (`SAMPLE-XXXXXX`), `sampleDeductionLinesFromSheet`.
- `lib/gateDelivery.ts`: `rashidActiveOrdersMongoFilter` now excludes `field_sample` so sample orders stay out of regular Rashid/Ali pickers.

## Result
Existing orders default to `standard`, trips to `regular`. Build passes.
