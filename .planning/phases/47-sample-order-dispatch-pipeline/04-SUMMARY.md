# Plan 04 Summary — Ali sample trips + Zaman gate flow

## What was built
- `app/(app)/dispatch/sample-trips/page.tsx`, `new/page.tsx`, `[id]/page.tsx`, `[id]/loading-sheet/page.tsx` (new): Ali's sample trip list, create, edit, and combined print sheet. Order picker uses `readySampleOrdersMongoFilter` (batches assigned, still at factory).
- `components/DispatchTripForm.tsx`: added `tripKind` and `basePath` props so the same form serves regular and sample trips (posts `tripKind`, redirects within the correct base route).
- `lib/dispatchTripSync.ts`: added `parseTripKind` and `assertOrdersMatchTripKind` (sample trips carry only sample orders; regular trips reject sample orders).
- `app/api/dispatch-trips/route.ts` + `[id]/route.ts`: POST accepts/persists `tripKind` with kind validation; PATCH validates order kind against the trip's kind; GET list and regular trips page filter to `regularTripsMongoFilter`.
- `app/(app)/dispatch/trips/page.tsx`: excludes sample trips.

## Zaman gate (all other steps unchanged)
- Gate eligibility is order-based, so sample orders appear at Zaman's gate automatically once on a completed sample trip (dispatch header + `weightsVerifiedAt` set at assign).
- `app/api/orders/[id]/gate-delivery/route.ts`: for `field_sample` orders, delivery close/partial/late-return records outcome but **skips** ready-bottle and packaging stock movements (already drawn from Esha's sample pool).

## Result
Ali dispatches sample trips separately from PO trips; regular and sample orders never mix on one trip. Samples deliver through Zaman unchanged. Build passes.
