# Plan 01 summary — Legacy orphan batch ready stock

## Done
- `ReadyBottleBatchLot`: `nimraLinked`, `batchProductName`
- `POST /api/ready-bottle-stock/lots` no longer requires Nimra batch
- Auto-links when batch exists in registry; otherwise **Legacy** lot
- UI badges, success messages, README discourages 0 L Nimra workaround
