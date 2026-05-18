---
wave: 1
depends_on: ["16-packaging-inventory/03-PLAN.md"]
gap_closure: false
files_modified:
  - "lib/models/BatchFillingDailyEntry.ts"
  - "lib/batchFillingWaste.ts"
  - "app/api/batch-filling/route.ts"
autonomous: true
---

<phase_goal>
Persist Rashid’s **daily per-batch filling log** and compute **variance vs Nimra’s system remaining liters**.
</phase_goal>

<must_haves>
- [ ] `BatchFillingDailyEntry` model: batchNo, entryDate, filledLitersToday, readyToDeliverLiters, physicalRemainingLiters, systemRemainingLiters (snapshot), wasteLiters (computed), note, recordedBy.
- [ ] Unique index on `(batchNo, entryDate)`.
- [ ] `lib/batchFillingWaste.ts`: `computeVariance(systemRemaining, physicalRemaining)` and optional `computeUnaccounted(...)`.
- [ ] `GET /api/batch-filling?date=` — returns batches with `totalLiters`, `usedLiters`, `systemRemainingLiters`, plus entry for date (if any).
- [ ] `PATCH /api/batch-filling` — dispatch_editor only; upsert entry; snapshot system remaining from `loadBatchUsageContext()` at save time.
- [ ] Reject negative liter fields; require existing `ProductionBatch` for batchNo.
</must_haves>

<tasks>
  <task id="1" name="model-and-waste-math">
    <step>Create `BatchFillingDailyEntry` schema with compound unique index on batchNo + entryDate.</step>
    <step>Add `lib/batchFillingWaste.ts` with variance helpers and liter parsing (≥ 0, finite).</step>
  </task>

  <task id="2" name="batch-filling-api">
    <step>`GET` merges ProductionBatch.find (non-empty batches or status in_use/available) with usage map and entries for `date` query (default today ISO date).</step>
    <step>`PATCH` upserts row; sets `systemRemainingLiters` from live usage; sets `wasteLiters = systemRemaining − physicalRemaining`.</step>
    <step>Auth: GET dispatch_editor + admin; PATCH dispatch_editor only.</step>
  </task>
</tasks>

<verification>
- PATCH entry for batch with system remaining 500 L, physical 480 L → wasteLiters = 20.
- Duplicate PATCH same batch+date updates same document.
- Unknown batchNo → 404.
- `npm run build` passes.
</verification>
