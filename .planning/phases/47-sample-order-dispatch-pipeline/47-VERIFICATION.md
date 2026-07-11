# Phase 47 Verification — Sample order dispatch pipeline

**Status:** passed (code verified against build; human UAT recommended)
**Date:** 2026-07-07
**Build:** `npm run build` → exit 0 (TypeScript + 66 routes generated, including `/dispatch/sample-orders*` and `/dispatch/sample-trips*`).

## Goal
Separate dispatch pipeline for field visit samples: rep request → Waleed approve → Rashid sample orders (deduct Esha pool on batch assign) → Ali sample trips → Zaman gate delivery (steps unchanged).

## Must-haves

### Plan 01 — schema/builders/filters
- [x] `Order.orderKind` includes `field_sample`; `fieldVisitTicketId`, `sampleRepName`, `sampleStockDeductedAt` present.
- [x] `DispatchTrip.tripKind` (`regular` default / `sample`).
- [x] `FieldVisitTicket.sampleDispatchOrderId` + `sampleDispatchStatus`.
- [x] `buildSampleOrderFromVisit` builds items/sheetLines + synthetic `SAMPLE-…` PO.
- [x] Filter helpers for regular vs sample orders/trips; regular lists exclude field samples.

### Plan 02 — approve → order, no early deduct
- [x] Approve outgoing → creates `field_sample` order linked both ways; ticket `awaiting_batches`.
- [x] `deductSampleProduction` removed from `request_sample_approval`.
- [x] Reject drops the linked order when batches not yet assigned.
- [x] Field visit copy: stock deducts at Rashid assignment.

### Plan 03 — Rashid sample orders
- [x] `/dispatch/sample-orders` lists field sample orders only.
- [x] Sample loading sheet uses sample production batches only.
- [x] Deduct once on full batch assignment; `sampleStockDeductedAt` set; regular route rejects field samples.
- [x] Remaining sample liters shown per batch option; nav separates Sample orders.

### Plan 04 — Ali sample trips + Zaman
- [x] `/dispatch/sample-trips` lists `tripKind: sample`; new/detail pages pick only ready sample orders.
- [x] Trip API validates no mixing of sample and regular orders; regular trips exclude samples.
- [x] Sample trips reach Zaman's gate; delivery/close/late return work with sample-safe stock handling.

## Notes / follow-ups
- Sample orders bypass carton-weight verification by design (single-bottle samples).
- Manual UAT: run the full flow end-to-end with live roles; confirm Esha pool decrement equals requested bottles.
