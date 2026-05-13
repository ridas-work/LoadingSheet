---
wave: 2
depends_on: ["08-production-batch-registry/01-PLAN.md"]
gap_closure: false
files_modified:
  - "lib/batchVolume.ts"
  - "lib/models/Order.ts"
  - "app/api/orders/[id]/batch-assignments/route.ts"
  - "components/LoadingSheetBatchEditor.tsx"
  - "app/(app)/orders/[id]/loading-sheet/page.tsx"
  - "app/(app)/orders/page.tsx"
  - "README.md"
  - ".planning/REQUIREMENTS.md"
autonomous: true
---

<phase_goal>
**Rashid** assigns **prepared batches** (from Nimra’s pool) to each PO on the loading sheet. He picks which batch fills each box row (product must match); system auto-calculates row **Weight (L)** and enforces **remaining liters** on the batch across all POs. Dispatch header/footer fields unchanged.
</phase_goal>

<assignment_rules>
1. Only batches where `ProductionBatch.productName` matches the row product (use same alias/normalize logic as `batchVolume.ts` catalog lookup).
2. Dropdown shows batch no + remaining liters (screen only).
3. Saving updates `Order.sheetLines[].batchNo` and `weight` per row.
4. **Global pool validation:** sum of liters taken from batch `B1` across **all orders** ≤ `ProductionBatch.totalLiters`.
5. Rashid uses existing **`?dispatch=1`** edit mode on loading sheet (extend — not a new role).
6. Nimra and PO team: view/print only; no batch assignment UI.
</assignment_rules>

<must_haves>
- [ ] **`PATCH /api/orders/[id]/batch-assignments`** — `dispatch_editor` only; body `{ assignments: [{ boxNo, batchNo }] }`; loads catalog + all production batches; validates product match + global remaining liters; writes `sheetLines` batchNo + weight.
- [ ] Loading sheet **dispatch edit mode**: batch column = select from matching batches (not free text); weight auto; over-allocation blocked with row/batch errors.
- [ ] Remove per-order `batchDefs` from Nimra flow; optional: stop reading `Order.batchDefs` for new saves (derive totals from `ProductionBatch`).
- [ ] Orders list for Rashid: **Edit dispatch** still opens `?dispatch=1` (batch assignment + vehicle/footer in one screen).
- [ ] Print view shows assigned batch no + weight per row.
- [ ] PO list batch progress: `filled/total` rows with batch no still works.
</must_haves>

<tasks>
  <task id="1" name="allocation-api">
    <step>Add `computeBatchRemainingLiters(batchNo, excludeOrderId?)` in `lib/batchVolume.ts` — scan all orders’ sheetLines.</step>
    <step>Implement PATCH batch-assignments with shared validation.</step>
  </task>

  <task id="2" name="dispatch-sheet-ui">
    <step>Extend `LoadingSheetBatchEditor`: fetch or receive available `ProductionBatch[]`; in `dispatchEditMode`, batch column = `<select>` filtered by row product.</step>
    <step>Save dispatch calls batch-assignments API (and existing dispatch PATCH for header/footer — either combined save or two buttons; prefer **one Save** that PATCHes both).</step>
    <step>Remove batch liter inputs panel (was Nimra-only).</step>
  </task>

  <task id="3" name="cleanup">
    <step>Deprecate `PATCH /api/orders/[id]/batches` for batch_editor (already 403) — document dispatch-only.</step>
    <step>Update README end-to-end workflow.</step>
  </task>
</tasks>

<out_of_scope>
- Auto-suggest which PO gets which batch.
- Splitting one batch across products.
- Editing Nimra’s production batch records from dispatch screen.
</out_of_scope>

<verification>
- Nimra creates batch B1 Rhino 1000 L.
- Rashid opens PO loading sheet dispatch mode → assigns B1 to Rhino rows → weights fill → save → print OK.
- Second PO assigning same B1 over limit → error.
- Nouman cannot PATCH batch-assignments.
- `npm run build` passes.
</verification>
