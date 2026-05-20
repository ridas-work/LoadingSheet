# Plan 01 — Summary

**Status:** complete

## Delivered

- `canEditOrders()` — admin only
- `lib/orderPayload.ts` — shared parse/validate for POST + PATCH
- `lib/preserveSheetBatches.ts` — keeps batch picks on matching rows
- `PATCH /api/orders/[id]` with audit fields `adminEditedAt`, `adminEditedByName`
- POST refactored to use `parseOrderBody`
