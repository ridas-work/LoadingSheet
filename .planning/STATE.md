# Project State

Phase: **11 planned** — Lock production batches for Nimra
Status: Ready to execute (`/gsd-execute-phase 11`)

## Context
- DELETE already blocks when batch liters are on loading sheets; PATCH does not — Nimra can still change QC data after dispatch.
- Nimra should see **Empty** / **In use** / **Available** instead of Edit on done batches.

## Decisions Made
- Lock when `usedLiters > 0` (any assignment on a PO).
- **Empty** = `remainingLiters <= 0`; still locked, distinct badge from **In use**.

## Next
- **Execute Phase 11:** `/gsd-execute-phase 11`
