# Phase 17 — Research: Rashid daily filling & waste vs Nimra batches

## User request

Rashid has duties beyond packaging inventory and dispatch trips:

1. Record **how much filling he did that day** (per production batch).
2. Record **ready-to-deliver** stock (filled goods waiting for dispatch).
3. Record **remaining batch quantity** he measures on the floor (physical leftover in the batch).
4. **Compare** his numbers to **Nimra’s remaining liters** on the same batch (from the production batch registry) to surface **waste / variance**.

## What the system already has (Nimra)

| Field | Source |
|-------|--------|
| `totalLiters` | `ProductionBatch` document |
| `usedLiters` | Sum of liters assigned on **loading sheet rows** (`sheetLines` batch + product liters) |
| `remainingLiters` | `totalLiters − usedLiters` via `usageForBatchNo()` / `loadBatchUsageContext()` |

This “Nimra remaining” is **book remaining**: liquid still not allocated to PO rows. It does **not** include Rashid’s physical drum reading or spillage.

## Recommended v1 data model

**`BatchFillingDailyEntry`** — one row per **batch + calendar date** (unique index):

| Field | Meaning |
|-------|---------|
| `batchNo` | Links to `ProductionBatch.batchNo` |
| `entryDate` | Calendar date (YYYY-MM-DD, factory local or UTC date) |
| `filledLitersToday` | Liters Rashid filled from this batch **today** |
| `readyToDeliverLiters` | Liters (or equivalent) **ready on shelf** for dispatch |
| `physicalRemainingLiters` | Rashid’s **measured** leftover in the batch |
| `systemRemainingLiters` | Snapshot at save: Nimra’s `remainingLiters` |
| `wasteLiters` | Computed on save (see below) |
| `note` | Optional |
| `recordedByUserId`, `recordedByName` | Audit |

Upsert on PATCH: same batch + date updates the row.

## Waste / variance formula (v1 — validate with stakeholder at UAT)

Display side-by-side:

- **Nimra remaining (system):** `totalLiters − usedLiters` (live from orders)
- **Rashid physical remaining:** `physicalRemainingLiters` (latest entry for batch, or today’s row)

**Variance (waste indicator):**

```text
varianceLiters = systemRemainingLiters − physicalRemainingLiters
```

Positive variance → system thinks more liquid should remain than Rashid measured (possible waste, spill, unlogged fill, or mis-count).  
Negative → Rashid measured more than system expects (possible unassigned fill or sheet not updated).

Optional v1 column (read-only): **unaccounted** using today’s row:

```text
unaccountedLiters = systemRemainingLiters − filledLitersToday − readyToDeliverLiters − physicalRemainingLiters
```

Use **variance** as primary “waste” column; show **unaccounted** as helper if both fill + deliver + physical are entered same day.

> **UAT question:** Confirm with operations whether waste = `system − physical` only, or should include `readyToDeliver` in the equation.

## Routes (Rashid)

| Route | Purpose |
|-------|---------|
| `/dispatch/filling` | Daily grid: open batches + Nimra remaining + inline Rashid fields (like packaging inventory) |
| Optional filter: `?date=YYYY-MM-DD` default today |

Admin: same page read-only.

## API

- `GET /api/batch-filling?date=YYYY-MM-DD` — merge `ProductionBatch` list + usage map + entries for date
- `PATCH /api/batch-filling` — body `{ batchNo, entryDate, filledLitersToday, readyToDeliverLiters, physicalRemainingLiters, note? }` — dispatch_editor only; recompute snapshots

## UI pattern

Reuse Phase 16 pattern: **single spreadsheet page**, inline inputs, save on row blur. Columns:

| Material / batch | Nimra remaining (L) | Filled today (L) | Ready to deliver (L) | Physical remaining (L) | Variance / waste (L) |

No separate detail page.

## Out of scope (later)

- Packaging auto-deduct when filling (→ **Phase 18**)
- Auto-decrement Nimra `totalLiters` from Rashid fill (manual reconciliation v1)
- Historical waste analytics dashboard (v1: table + today default; optional week view later)

## Dependencies

- Phase 08–11: Production batch registry + usage from orders
- Phase 16: Packaging inventory (parallel concern, no hard dependency)
