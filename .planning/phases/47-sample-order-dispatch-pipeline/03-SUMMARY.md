# Plan 03 Summary — Rashid sample orders + sample batch assign + deduct

## What was built
- `app/(app)/dispatch/sample-orders/page.tsx` (new): lists `field_sample` orders with batch progress, deducted/on-trip/gate status; links to the assign sheet.
- `app/(app)/dispatch/sample-orders/[id]/loading-sheet/page.tsx` (new): builds per-line sample batch options via `productsMatch` against `sampleBatchAvailability()` and renders the new assignment sheet.
- `components/SampleBatchAssignmentSheet.tsx` (new): one dropdown per product from sample production batches only; saves to the sample batch route.
- `app/api/orders/[id]/sample-batch-assignments/route.ts` (new): validates each batch is a sample batch for its product; when all lines are assigned, calls `deductSampleProduction` (linked visit ticket), sets `sampleStockDeductedAt` + `weightsVerifiedAt`, and marks the ticket `sampleDispatchStatus: batched`. Guards against re-deduction.
- `lib/sampleProductionStock.ts`: added `sampleBatchAvailability()` (open sample batches with remaining liters).
- `app/api/orders/[id]/batch-assignments/route.ts`: regular batch assignment now rejects `field_sample` orders.
- `app/(app)/layout.tsx`: added **Sample orders** / **Sample trips** nav for Rashid and admin.

## Result
Rashid assigns sample batches on a dedicated route; Esha's sample pool decreases only when assignment is complete. Regular PO assignment unaffected. Build passes.
