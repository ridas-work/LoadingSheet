---
wave: 1
depends_on: ["10-production-batch-qc-fields/02-PLAN.md"]
gap_closure: false
files_modified:
  - "lib/productionBatchStatus.ts"
  - "app/api/production-batches/[id]/route.ts"
  - "app/api/production-batches/route.ts"
autonomous: true
---

<phase_goal>
Once a production batch is **assigned on any loading sheet**, Nimra **cannot edit or delete** it. API enforces the same rule as UI.
</phase_goal>

<stakeholder_need>
QC data Nimra entered must not change after Rashid has used the batch on a PO. Today DELETE is guarded but PATCH is not — Nimra can still alter pH, solids, liters, etc. after dispatch started.
</stakeholder_need>

<must_haves>
- [ ] Shared helper: used liters + status (`available` | `in_use` | `empty`) + `isProductionBatchLocked`.
- [ ] PATCH `/api/production-batches/[id]` returns **403** when `usedLiters > 0`.
- [ ] GET list/detail include `usedLiters`, `remainingLiters`, `status`, `locked`.
</must_haves>

<tasks>
  <task id="1" name="status-helper">
    <step>Create `lib/productionBatchStatus.ts` using `accumulateBatchUsageFromOrders` + catalog load pattern from DELETE handler.</step>
  </task>
  <task id="2" name="api-guards">
    <step>PATCH: reject when locked.</step>
    <step>Extend GET `[id]` and list GET with usage fields.</step>
  </task>
</tasks>

<verification>
- Assign batch on a PO row → Nimra PATCH same batch → 403.
- Unused batch → PATCH still works.
- `npm run build` passes.
</verification>
