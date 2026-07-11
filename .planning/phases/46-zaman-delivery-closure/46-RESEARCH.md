# Phase 46 — Zaman delivery closure & partial returns — research

## RESEARCH COMPLETE

### Stakeholder goal

When **Zaman** marks an order **delivered**, he also **closes** it permanently. He records whether delivery was **full** or **partial**:

| Outcome | Behaviour |
|---------|-----------|
| **Full** | All dispatched bottles accepted by customer → close PO, no returns |
| **Partial** | Some bottles came back → per product: **delivered**, **damaged** (fail/write-off), **returned good** (back to Rashid ready stock) |

Summary table for management: **PO | delivered | damaged | returned** (per product row; PO-level totals in reports).

### Current codebase (relevant)

| Area | Location | Today |
|------|----------|-------|
| Gate statuses | `lib/gateDelivery.ts` | `none` → `out_for_delivery` → `delivered` \| `pending_redelivery` |
| Gate API | `app/api/orders/[id]/gate-delivery/route.ts` | On `delivered`: deduct **full** ready bottles + packaging; on `pending_redelivery` from `delivered`: **full** restore via `restoreReadyBottlesAfterReturn` |
| Ready stock | `lib/readyBottleDispatch.ts`, `lib/readyBottleLedger.ts` | `applyReadyBottleDelta`, `applyReadyBatchLotDelta`, movement reasons `delivered`, `delivery_return` |
| Gate UI | `components/GateOrdersTable.tsx` | One-click status buttons, no closure form |
| Order model | `lib/models/Order.ts` | `gateDeliveryStatus`, `readyBottleDeductionSummary`, no closure/outcome fields |
| Order lock | `isOrderLockedAfterDelivery` | `delivered` = locked |
| Dispatched qty | `lib/bottlesFromSheetLines.ts` | Aggregates bottles per product from `sheetLines` |

### Design decisions (v1)

1. **Close = deliver** — Replace bare “Mark delivered” with **Close delivery** wizard; successful submit sets `gateDeliveryStatus: delivered` **and** `orderClosedAt` (new).
2. **`deliveryOutcome` enum** — `full` \| `partial`. Full skips line entry; partial requires lines.
3. **Per-product closure lines** (aggregated from loading sheet, not per carton row):
   - `productCode`, `productName`
   - `dispatchedBottles` (read-only, from sheet)
   - `deliveredBottles` (to customer)
   - `damagedBottles` (write-off)
   - `returnedBottles` (good stock back to Rashid) — user-facing label **Returned**
   - Validation: `deliveredBottles + damagedBottles + returnedBottles === dispatchedBottles`, all ≥ 0
4. **Stock logic (partial)** — Keep deduct-on-delivered for **full dispatched** amount (existing), then **restore only `returnedBottles`** (good) to same pools/batch lots using proportional restore from `readyBottleDeductionSummary`. **Damaged** bottles are **not** restored (remain deducted = fail/waste). For **full** outcome, no restore.
5. **Full outcome** — `deliveredBottles = dispatched`, `damaged = 0`, `returned = 0`; same stock path as today.
6. **`pending_redelivery`** — Keep for whole-load return **before** closure (existing flow). Once closed `delivered`, no further gate edits. Partial closure replaces “delivered then pending redelivery” for mixed outcomes.
7. **Packaging** — v1: packaging deduction stays **full PO** on close (same as today). Partial bottle returns do not auto-reverse packaging; note in plan for stakeholder if they want proportional packaging later.
8. **Reporting** — Extend `lib/adminDeliverySummary.ts` or Waleed reports with closure lines; table columns: PO, product, delivered, damaged, returned.
9. **Roles** — Only `gate_guard` + `admin` can close delivery (`canEditGateDelivery` already exists).

### Risks / open questions

- **Proportional batch-lot restore**: `readyBottleDeductionSummary` has `lots[]`; restore good returns in FIFO proportion across lots (mirror `restoreReadyBottlesAfterReturn` but partial qty).
- **Mixed sample / custom cartons**: use same `bottlesPerProductFromSheetLines` aggregation; drum/Glim lines follow existing skip rules.
- **Zero delivered** (full return): valid partial with `delivered=0`, all returned or damaged — still closes as `delivered`.

### Files likely touched

- `lib/models/Order.ts` — closure fields
- `lib/gateDeliveryClosure.ts` (new) — parse/validate closure payload
- `lib/readyBottleDispatch.ts` — `restoreGoodReturnsAfterPartialDelivery`
- `app/api/orders/[id]/gate-delivery/route.ts` — accept closure body on deliver
- `components/GateOrdersTable.tsx` — close-delivery modal + per-product table
- `lib/adminDeliverySummary.ts`, `components/AdminReportsHub.tsx` or gate admin view — summary table
