# Phase 39 Research — Glim bulk fill (no production batch)

## RESEARCH COMPLETE

### User question
**Glim** is made in **bulk** (tank), then filled into bottles for dispatch. It does **not** use Nimra QC production batches like Rhino/Brighten. Can a Glim PO go through the loading sheet **without assigning a batch number**?

### Answer: **Yes — with a catalog flag and targeted bypasses**

Today **every** standard loading-sheet row must have `batchNo` before Rashid can lock dispatch:

| Checkpoint | File | Current rule |
|------------|------|--------------|
| Batch complete | `lib/bundleCatalog.ts` → `lineBatchComplete` | `batchNo` required |
| Ready + batch | `lib/readyStockAllocation.ts` → `lineBatchCompleteWithReady`, `validateReadyBatchRequirements` | batch required unless fully from ready shelf |
| Save API | `app/api/orders/[id]/batch-assignments/route.ts` | `validateSheetBatchAllocations` + `validateReadyBatchRequirements` |
| UI lock | `lib/orderBatchStatus.ts` → `isBatchAssignmentLocked` | all lines must be "complete" |

**Glim is not in `ProductPacking` Mongo yet** (BOM + Rashid plan reference `glim`; catalog row missing). Packaging SKUs exist (`glim-spray`, `glim-bottle`, stickers).

### Recommended design

1. **`requiresProductionBatch`** on `ProductPacking` (default `true`). Set **`false` for `glim`** (extensible to future bulk-fill SKUs).
2. Helper **`isBulkFillProduct(line, catalog)`** — true when matched packing has `requiresProductionBatch === false`.
3. **Batch assignment bypass** for bulk-fill lines:
   - `lineBatchComplete` → always `true` (no `batchNo` needed)
   - `lineBatchAllocations` → `[]` (no liter pool / Nimra batch consumption)
   - `validateReadyBatchRequirements` → skip bulk-fill lines
   - `validateSheetBatchAllocations` → skip lines with zero allocations (already sets weight `null` — OK)
4. **Loading sheet UI** (`LoadingSheetBatchEditor.tsx`):
   - Hide batch dropdown for Glim rows
   - Show label **"Bulk fill (no batch)"** in batch column (print + screen)
5. **Weight / carton check** — unchanged; Rashid still enters or verifies carton kg.
6. **Packaging deduction on delivery** — unchanged; `packagingDeduction` uses product code from catalog, not batch.
7. **Ready stock (optional v1)** — Glim can ship from **aggregate ready stock** only; batch lot on ready shelf uses normal batch label if Rashid adds stock later. No Nimra batch link required.

### Out of scope (v1)
- Nimra bulk-tank registry (separate from QC batches)
- Auto-deduct bulk tank liters
- Multiple bulk-fill products beyond Glim (flag supports them when added)

### Risks / edge cases
- **Mixed PO** (Glim + Rhino): only Glim rows skip batch; Rhino still needs batches.
- **Reports** batch filter: Glim rows show blank batch — document in admin reports.
- **Gate delivery**: ready-stock deduction uses bottle counts from sheet lines; works without batch on line if not allocated from ready shelf batches.

### Test scenarios
1. PO with Glim only → Rashid saves dispatch **without** batch → batches lock → weights → gate out → delivered → packaging deducts glim BOM.
2. PO with Glim + Rhino → Glim no batch, Rhino needs batch → save blocked until Rhino assigned.
3. Print loading sheet → Glim batch column shows "Bulk fill" or "—".
