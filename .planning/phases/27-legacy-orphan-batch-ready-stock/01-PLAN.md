---
wave: 1
depends_on: ["26-ready-bottle-stock-ledger/03-PLAN.md"]
gap_closure: false
files_modified:
  - "lib/models/ReadyBottleBatchLot.ts"
  - "lib/readyBottleLedger.ts"
  - "app/api/ready-bottle-stock/lots/route.ts"
  - "app/api/ready-bottle-stock/route.ts"
  - "components/ReadyBottleStockPanel.tsx"
  - "app/(app)/dispatch/ready-stock/movements/page.tsx"
  - "README.md"
autonomous: true
---

<phase_goal>
Let Rashid register **pre-filled ready bottles** with **batch no + product + bottles** even when the batch is **not in Nimra** (liquid gone or never registered). Prefer this over Nimra 0-liter dummy batches.
</phase_goal>

<must_haves>
- [ ] `ReadyBottleBatchLot` gains `nimraLinked: boolean` (true only when `ProductionBatch` exists at save; else false).
- [ ] `POST /api/ready-bottle-stock/lots` **does not require** Nimra batch; still validates product catalog + bottles ≥ 1.
- [ ] If batch no matches Nimra registry, set `nimraLinked: true` and optional `batchProductName` snapshot from registry.
- [ ] `GET /api/ready-bottle-stock` returns `nimraLinked` per lot; UI shows **Legacy** vs **In Nimra** badge.
- [ ] Panel copy: batch field is a **label for traceability** — can be old batch numbers not in system.
- [ ] Movements page shows legacy vs linked in batch column.
- [ ] README: document two paths (orphan legacy lot vs active Nimra daily filling).
</must_haves>

<tasks>
  <task id="1" name="model-and-ledger">
    <step>Add `nimraLinked`, optional `batchProductName` to `ReadyBottleBatchLot`.</step>
    <step>Update `addBatchLot` to accept `{ nimraLinked, batchProductName }` and store on lot.</step>
  </task>

  <task id="2" name="api-relax-batch-check">
    <step>In lots POST: lookup `ProductionBatch` optionally; if missing, proceed with `nimraLinked: false`.</step>
    <step>If batch exists, warn mismatch if product family doesn't match selected packing (soft note in lot note only — do not block).</step>
    <step>Return clear success message distinguishing linked vs legacy lot.</step>
  </task>

  <task id="3" name="ui-copy">
    <step>`ReadyBottleStockPanel`: batch input not limited to datalist only — free text allowed; help text explains legacy batches.</step>
    <step>Lot table columns: Batch, Nimra?, Product, Bottles, Note.</step>
    <step>Remove error that blocked unknown batches (client-side).</step>
  </task>

  <task id="4" name="docs">
    <step>README workflow bullet: legacy orphan lots vs Nimra-linked filling; explicitly **discourage** Nimra 0 L workaround.</step>
  </task>
</tasks>

<verification>
- `npm run build` passes.
- Rashid adds lot batch `OLD-B-99`, Rhino 500ml, 150 bottles — succeeds without Nimra batch.
- Rashid adds lot with real Nimra batch no — `nimraLinked: true`.
- Zaman delivered still deducts from product on-hand (Phase 26 unchanged).
</verification>
