# Plan 03 — Delivered-order auto-deduct — complete

## Done

- Added packaging deduction audit fields to `Order`.
- `PATCH /api/orders/[id]/gate-delivery` now previews and applies packaging deduction when Zaman marks an order `delivered`.
- Delivery is blocked if packaging mappings are missing or stock would go negative.
- `PackagingStockMovement` rows are created with reason `used` and PO/order details in the note.
- Pending redelivery and out-for-delivery do not deduct packaging.
- Gate page and README mention that Delivered deducts packaging automatically.

## Verification

- `npm run build` passes.
