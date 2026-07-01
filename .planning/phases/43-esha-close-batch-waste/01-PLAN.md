---
wave: 1
depends_on: []
gap_closure: false
files_modified:
  - "lib/models/ProductionBatch.ts"
  - "lib/productionBatchStatus.ts"
  - "lib/sampleProductionStock.ts"
  - "lib/readyBatchPool.ts"
  - "lib/productionBatchClose.ts"
autonomous: true
---

<phase_goal>
Add **batch closure** schema and server-side rules so closed batches are excluded from dispatch/sample pools — no UI yet.
</phase_goal>

<must_haves>
- [ ] `ProductionBatch` closure fields: `closedAt`, `closedByUserId`, `closedByName`, `closureWasteLiters`, `closureWasteNote`, `closureUsedLitersSnapshot`, `closureRemainingLitersSnapshot` (all optional/null default)
- [ ] `lib/productionBatchClose.ts` — `isBatchClosed(batch)`, `openProductionBatchMongoFilter()`, `validateBatchClose({ batch, usage, wasteLiters })` with rules from RESEARCH
- [ ] `openProductionBatchMongoFilter()` applied to Rashid assignable batch queries (`batch-assignments`, `readyBatchPool`, any PO pool builder)
- [ ] Sample pool (`sampleProductionStock.ts`) ignores batches with `closedAt` set
- [ ] `usageForBatchNo` or wrapper treats closed batches as **empty / not assignable** (remaining 0 for pool purposes)
- [ ] Existing rows: `closedAt: null` → still open
</must_haves>

<tasks>
  <task id="1" name="schema">
    <step>Add closure fields to `ProductionBatchSchema`.</step>
    <step>Export types if needed for API serialization.</step>
  </task>

  <task id="2" name="close-lib">
    <step>Create `lib/productionBatchClose.ts` with `isBatchClosed`, `openProductionBatchMongoFilter`, `validateBatchClose`.</step>
    <step>Validation: batch_editor-only caller check left to API; waste `>= 0`, `<= remainingLiters` (rounded), `qcOutcome === approved`, not already closed.</step>
  </task>

  <task id="3" name="pool-filters">
    <step>Merge `openProductionBatchMongoFilter()` into regular + sample pool Mongo queries.</step>
    <step>Update `readyBatchPool` / batch-assignments to skip closed batches.</step>
    <step>When batch has `closedAt`, assignment remaining = 0 in status helpers.</step>
  </task>
</tasks>

<verification>
- Mongo: batch with `closedAt` not returned by open filter.
- Closed approved batch not in batch-assignments picker data.
- `npm run build` passes.
</verification>
