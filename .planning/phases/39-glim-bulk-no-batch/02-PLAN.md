---
wave: 2
depends_on: ["39-glim-bulk-no-batch/01-PLAN.md"]
gap_closure: false
files_modified:
  - "lib/bundleCatalog.ts"
  - "lib/readyStockAllocation.ts"
  - "lib/orderBatchStatus.ts"
  - "app/api/orders/[id]/batch-assignments/route.ts"
autonomous: true
---

<phase_goal>
**Server-side** batch rules: Glim (and any `requiresProductionBatch: false` product) completes dispatch **without** `batchNo` and does not consume Nimra batch liters.
</phase_goal>

<must_haves>
- [ ] `lineBatchComplete` in `bundleCatalog.ts`: return `true` for bulk-fill lines without `batchNo`.
- [ ] `lineBatchAllocations`: return `[]` for bulk-fill lines (no pool validation).
- [ ] `lineBatchCompleteWithReady` in `readyStockAllocation.ts`: bulk-fill lines complete without batch.
- [ ] `validateReadyBatchRequirements`: skip bulk-fill lines.
- [ ] `lineNeedsBatch` / `componentNeedsBatch`: return `false` for bulk-fill components.
- [ ] `batch-assignments` PATCH: bulk-fill lines save with empty `batchNo`; validation passes when only non-bulk lines have batches.
- [ ] `isBatchAssignmentLocked` / `batchProgress`: bulk-fill lines count as filled without batch.
</must_haves>

<tasks>
  <task id="T1" title="bundleCatalog bypasses">
    <step>Import `isBulkFillProduct` in `bundleCatalog.ts`.</step>
    <step>Early-return in `lineBatchComplete`, `lineBatchAllocations`, `lineBatchDisplay` (show `bulkFillBatchLabel()`).</step>
  </task>
  <task id="T2" title="readyStockAllocation bypasses">
    <step>Update `lineBatchCompleteWithReady`, `lineNeedsBatch`, `validateReadyBatchRequirements`.</step>
  </task>
  <task id="T3" title="API integration">
    <step>Confirm `validateSheetBatchAllocations` handles zero allocations (weight null OK).</step>
    <step>Manual test: PATCH assignments with Glim row `batchNo: ""` succeeds.</step>
  </task>
</tasks>

<verification>
- Unit-style: `lineBatchComplete({ productName: "Glim", bottlesPerBox: 10 }, catalogWithGlim)` → `true` with empty batchNo.
- Mixed PO: validation error only names non-bulk products missing batch.
</verification>
