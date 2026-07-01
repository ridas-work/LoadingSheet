---
wave: 1
depends_on: []
gap_closure: false
files_modified:
  - "lib/models/ProductionBatch.ts"
  - "lib/models/SampleProductionMovement.ts"
  - "lib/sampleProductionStock.ts"
  - "lib/productionBatchStatus.ts"
  - "lib/readyBatchPool.ts"
  - "lib/models/FieldVisitTicket.ts"
  - "lib/fieldVisitTypes.ts"
autonomous: true
---

<phase_goal>
Split Esha’s production registry into **regular** vs **sample** batches, with a sample pool ledger and FIFO deduction helpers — no UI yet.
</phase_goal>

<must_haves>
- [ ] `ProductionBatch.productionPurpose`: `"regular" | "sample"` (default `"regular"`); existing rows treated as regular
- [ ] `SampleProductionMovement` model — `visitTicketId`, `productName`, `batchNo`, `liters`, `bottles`, `recordedAt`, `recordedByName`, `repUsername`
- [ ] `lib/sampleProductionStock.ts` — `samplePoolForCatalog()`, `remainingSampleLiters(batch)`, `deductSampleProduction({ products, visitTicketId, actor })` with FIFO across sample batches by `preparedAt`
- [ ] Deduction uses catalog `litersPerBottle`; default **1 bottle** per sample product line if `bottles` omitted
- [ ] `regularProductionBatchMongoFilter()` → `{ productionPurpose: { $ne: "sample" } }` (or `$in: [null, "regular"]` for legacy)
- [ ] Rashid batch-assignment and `readyBatchPool` paths use regular filter only — sample batches never appear on PO loading sheet picks
- [ ] Optional `bottles: number` on `FieldVisitTicket.sampleProducts` schema (min 1, default 1) for accurate deduction later
</must_haves>

<tasks>
  <task id="1" name="schema">
    <step>Add `productionPurpose` enum to `ProductionBatch` schema.</step>
    <step>Create `SampleProductionMovement` schema + export.</step>
    <step>Add optional `bottles` to `SampleProductSchema` on `FieldVisitTicket`.</step>
    <step>Update `parseSampleProducts` in `fieldVisitTickets.ts` to read `bottles` (default 1).</step>
  </task>

  <task id="2" name="sample-stock-lib">
    <step>Implement `lib/sampleProductionStock.ts` — aggregate remaining liters per family from sample batches minus sum of movements per batch.</step>
    <step>FIFO deduct: walk sample batches matching product family oldest-first; write movement rows; update batch-level drawn total or derive from movements.</step>
    <step>Export `insufficientSampleStockError(products, catalog)` for API messages.</step>
  </task>

  <task id="3" name="regular-pool-filter">
    <step>Add `regularProductionBatchMongoFilter()` to `lib/sampleProductionStock.ts` or `lib/productionBatchStatus.ts`.</step>
    <step>Apply filter wherever Rashid loads assignable batches (batch-assignments API, pool builders used on loading sheet).</step>
    <step>Confirm Esha list API can still return all batches when `?purpose=all` or unfiltered.</step>
  </task>
</tasks>

<verification>
- Unit-style smoke: create sample batch in Mongo → not returned by regular pool query.
- `deductSampleProduction` reduces remaining liters and creates movement doc.
- `npm run build` passes.
</verification>
