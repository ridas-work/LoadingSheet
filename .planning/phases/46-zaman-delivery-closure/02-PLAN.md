---
wave: 1
depends_on: []
gap_closure: false
files_modified:
  - "lib/readyBottleDispatch.ts"
  - "lib/readyBottleLedger.ts"
autonomous: true
---

<phase_goal>
Apply **correct ready-bottle stock movements** when Zaman closes a partial delivery: full dispatch deduct, restore **returned good** bottles only; **damaged** bottles stay written off.
</phase_goal>

<must_haves>
- [ ] On close (`delivered`), existing full deduct runs first (unchanged packaging + ready path).
- [ ] New `restoreGoodReturnsAfterPartialDelivery` restores only `returnedBottles` per product from `deliveryClosureLines`.
- [ ] Restore uses proportional split across `readyBottleDeductionSummary.lots` when present (FIFO by lot order in summary).
- [ ] Damaged bottles are never restored; delivered bottles remain deducted.
- [ ] Movement ledger notes cite PO, product, and counts (`returned good` vs `damaged write-off` in note text).
- [ ] Full outcome (`returned = 0` everywhere) performs no extra restore beyond existing deduct.
</must_haves>

<tasks>
  <task id="T1" title="Partial good-return restore">
    <step>Add `restoreGoodReturnsAfterPartialDelivery({ orderId, poNumber, closureLines, deductionSummary, catalog, audit })` in `lib/readyBottleDispatch.ts`.</step>
    <step>For each closure line with `returnedBottles > 0`, find matching summary row by `productCode`.</step>
    <step>If summary has `lots`, allocate restore bottles across lots proportionally (same pattern as full restore but capped at `returnedBottles`).</step>
    <step>Call `applyReadyBottleDelta` / `applyReadyBatchLotDelta` with positive delta and reason `delivery_return` or new reason `partial_return_good`.</step>
  </task>

  <task id="T2" title="Damaged write-off audit">
    <step>Do not add stock for `damagedBottles`; optionally record movement note-only row or store damaged totals on order only (no stock delta).</step>
    <step>Ensure damaged + delivered bottles remain net-deducted from Rashid on-hand vs pre-trip state.</step>
  </task>

  <task id="T3" title="Integrate in gate-delivery route (hook point)">
    <step>Export helper `applyDeliveryClosureStock({ existing, closure, audit })` callable from `gate-delivery/route.ts` after standard deduct.</step>
    <step>Skip restore when `deliveryOutcome === "full"` or all `returnedBottles === 0`.</step>
    <step>Return clear error if restore would exceed what was deducted for that product.</step>
  </task>
</tasks>

<verification>
- Scenario A: 100 dispatched, 80 delivered, 15 returned, 5 damaged → net stock change = -85 bottles (100 deduct, +15 restore).
- Scenario B: Full delivery → identical stock result to pre-phase-46 behaviour.
- `npm run build` passes.
</verification>
