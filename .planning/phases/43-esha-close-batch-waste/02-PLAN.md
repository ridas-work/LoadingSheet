---
wave: 2
depends_on: ["43-esha-close-batch-waste/01-PLAN.md"]
gap_closure: false
files_modified:
  - "app/api/production-batches/[id]/close/route.ts"
  - "lib/productionBatchApi.ts"
  - "app/api/production-batches/[id]/route.ts"
autonomous: true
---

<phase_goal>
**Close batch API** — Esha submits waste liters and closes an approved open batch atomically.
</phase_goal>

<must_haves>
- [ ] `POST /api/production-batches/[id]/close` — auth `batch_editor` only
- [ ] Body: `{ wasteLiters: number, note?: string, confirmed: boolean }` — `confirmed` must be true
- [ ] Server loads batch + usage snapshot; runs `validateBatchClose`; sets all closure fields + `closedAt` / actor
- [ ] Returns closed batch JSON (id, batchNo, closure fields, snapshots)
- [ ] `PATCH` on main production-batches route rejects edits when `closedAt` set (403)
- [ ] `qc-status` route rejects actions on closed batches
</must_haves>

<tasks>
  <task id="1" name="close-route">
    <step>Create `app/api/production-batches/[id]/close/route.ts` POST handler.</step>
    <step>Parse and validate body; load usage via `loadBatchUsageContext` + `usageForBatchNo`.</step>
    <step>On success: save batch, return serialized close payload.</step>
  </task>

  <task id="2" name="guard-mutations">
    <step>In `app/api/production-batches/[id]/route.ts` PATCH — if `closedAt` return 403 "Batch is closed".</step>
    <step>In `qc-status` PATCH — same guard.</step>
    <step>Add `serializeProductionBatch` closure fields in `lib/productionBatchApi.ts` if used by clients.</step>
  </task>
</tasks>

<verification>
- POST close on approved open batch with waste = remaining → 200, `closedAt` set.
- POST close on already closed → 400.
- PATCH edit on closed batch → 403.
- `npm run build` passes.
</verification>
