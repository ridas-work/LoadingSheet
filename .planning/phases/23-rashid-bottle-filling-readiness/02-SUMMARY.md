# Plan 02 — Bottle filling table UI — complete

## Done

- Reworked `BatchFillingGrid` into a table-within-each-batch for multiple product/packing rows.
- Rashid can add rows, select a packing, and enter `Filled bottles` plus `Ready bottles`.
- `Ready to deliver` copy explains fully finished stock: capped, labeled/stickered, packed/finished, and ready for dispatch.
- Physical remaining remains in liters, and variance remains liter-based using derived filled/ready liter totals.
- Admin/read-only view shows bottle rows plus derived liters, with legacy liter-only entries still visible.
- Updated `/dispatch/filling` page copy, admin link text, and README workflow text.

## Verification

- `npm run build` passes.
