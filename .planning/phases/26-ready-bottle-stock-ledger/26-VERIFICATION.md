# Phase 26 verification — Ready bottle stock ledger

**Status:** passed (build + goal-backward review)

## Must-haves

| Item | Status |
|------|--------|
| Product-level on-hand ledger | ✓ `ReadyBottleStock` |
| Batch no + bottles for legacy/pre-filled | ✓ `ReadyBottleBatchLot` + POST `/lots` |
| Rashid panel on daily filling | ✓ `ReadyBottleStockPanel` |
| Filling ready → ledger delta | ✓ `readyBottleFillingSync` |
| **Deduct on Zaman delivered** (not out_for_delivery) | ✓ `gate-delivery` route |
| Packaging + ready deduct together on delivered | ✓ same PATCH handler |
| Restore on pending redelivery | ✓ `restoreReadyBottlesAfterReturn` |
| Loading sheet ready vs need | ✓ `ReadyStockCheck` |
| Movements audit | ✓ `/dispatch/ready-stock/movements` |

## Build
- `npm run build` — passed

## Manual UAT
1. Rashid: `/dispatch/filling` → Add ready stock (batch B-xxx, Rhino 500ml, 200 bottles)
2. Rashid: save ready-to-deliver on a batch line → on-hand increases
3. Open loading sheet for PO with those products → see ready vs need
4. Zaman: Mark **Delivered** → ready on-hand decreases; packaging UIP still updates
5. If insufficient ready stock, delivered PATCH returns error with product shortfall
