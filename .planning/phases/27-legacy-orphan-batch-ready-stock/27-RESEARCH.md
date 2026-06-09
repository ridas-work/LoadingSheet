# Phase 27 research — Legacy batches not in Nimra (orphan ready stock)

## User question

> Some batches were already made and are now null (no liquid left in Nimra). I want Rashid to add **batch no + bottles** for ready-to-deliver product even when the batch is **not in Nimra**.  
> **Option A:** Rashid portal — add batch + bottles directly.  
> **Option B:** Nimra creates batch with **0 liters**, then Rashid fills bottles through daily filling.  
> Which do you prefer? Future orders should consume this ready stock.

## Recommendation: **Option A (Rashid orphan lots)** — not Nimra 0-liter batches

| | Option A — Rashid legacy lot | Option B — Nimra 0 L batch |
|--|------------------------------|---------------------------|
| Matches reality | ✓ Bottles on shelf; liquid batch may be gone | ✗ Fake liquid pool |
| Nimra registry clean | ✓ No dummy batches | ✗ Pollutes batch list |
| Waste / variance math | ✓ Orphan lots skip liter reconciliation | ✗ 0 L breaks remaining-liter logic |
| Loading-sheet batch assign | ✓ No risk assigning empty pool | ✗ Empty batch might appear assignable |
| Rashid workload | One form: batch label + product + bottles | Nimra + Rashid two-step |
| Order deduct (Phase 26) | ✓ Same product-level ledger | ✓ Same if ready pool updated |

**Hybrid (recommended operating model):**

1. **Legacy / Nimra-empty / never registered** → Rashid **Add ready stock** with **any batch label** + product + bottles (`nimraLinked: false`).
2. **Active Nimra batch still filling** → Rashid **daily filling** “Ready to deliver” (adds to same ledger) **or** legacy lot if bottles were finished outside the daily log.

Phase 26 already built the ledger and **delivered** deduct; the gap is **`POST /api/ready-bottle-stock/lots` rejects batch if not in `ProductionBatch`**.

## Implementation sketch

- `ReadyBottleBatchLot.nimraLinked: boolean` (default `false` for free-text legacy; `true` when matched to `ProductionBatch` at save time if batch exists).
- API: remove hard requirement for `ProductionBatch`; optional soft link when batch exists.
- UI: rename copy to **“Batch label (may not be in Nimra)”**; show badge **Legacy** vs **Nimra batch** in lot table.
- Do **not** add orphan rows to daily filling grid (keeps waste math batch-scoped to real liquid).

## Out of scope

- Auto-creating Nimra batches from Rashid entry
- Per-batch FIFO deduct on delivery (stay product-level pool)
- Restoring packaging UIP on redelivery (unchanged)

## RESEARCH COMPLETE
