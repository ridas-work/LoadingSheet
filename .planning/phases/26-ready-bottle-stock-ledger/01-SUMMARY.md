# Plan 01 summary — Ready bottle ledger core

## Done
- `ReadyBottleStock`, `ReadyBottleBatchLot`, `ReadyBottleMovement` models
- `lib/readyBottleLedger.ts` — deltas, batch lots, stock map
- `lib/bottlesFromSheetLines.ts` — bottle needs per product from sheet lines
- APIs: `GET /api/ready-bottle-stock`, `POST .../lots`, `PATCH .../[code]`, `GET .../movements`

## User override
- Batch lot entry includes **batch no + product + bottles** for legacy pre-filled stock.
