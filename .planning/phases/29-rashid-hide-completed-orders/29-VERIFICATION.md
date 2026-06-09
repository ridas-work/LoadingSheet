# Phase 29 Verification

**Status:** passed  
**Date:** 2026-06-08

## Must-haves

| Check | Result |
|-------|--------|
| `rashidActiveOrdersMongoFilter()` in `lib/gateDelivery.ts` | ✓ |
| `/orders` filters for `dispatch_editor` only | ✓ |
| `/dispatch/trips/new` picker filtered | ✓ |
| Trip detail picker filtered (+ trip members kept) | ✓ |
| `OrdersListWithTrips` hides Assign batches when gate-complete | ✓ |
| Trip linked rows gate badges, no Assign on delivered/out | ✓ |
| `npm run build` | ✓ |
| README updated | ✓ |

## Manual UAT (recommended)

- [ ] Rashid: CSD Fortress (delivered) absent from `/orders`
- [ ] Admin: same PO still on `/orders`
- [ ] Rashid: `pending_redelivery` PO still visible with Assign batches if incomplete
- [ ] Trip with delivered PO: View/print only on trip detail
