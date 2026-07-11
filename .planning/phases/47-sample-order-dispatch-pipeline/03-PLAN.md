---
wave: 2
depends_on: ["01-PLAN.md", "02-PLAN.md"]
gap_closure: false
files_modified:
  - "app/(app)/dispatch/sample-orders/page.tsx"
  - "app/(app)/dispatch/sample-orders/[id]/loading-sheet/page.tsx"
  - "app/api/orders/[id]/batch-assignments/route.ts"
  - "components/TripBatchAssignmentSheet.tsx"
  - "lib/roles.ts"
  - "app/(app)/layout.tsx"
autonomous: true
---

<phase_goal>
**Rashid** manages approved samples at **`/dispatch/sample-orders`**, assigns **sample production batches only**, and **deducts Esha pool on save**.
</phase_goal>

<must_haves>
- [ ] `/dispatch/sample-orders` lists `field_sample` orders awaiting batches / trip (not regular POs).
- [ ] Loading sheet route for sample order uses sample batch dropdown (`sampleProductionBatchMongoFilter`).
- [ ] On batch assignment PATCH when all lines filled: `deductSampleProduction` once; set `sampleStockDeductedAt`.
- [ ] Show sample pool availability (liters/bottles estimate) on assign screen.
- [ ] Nav: Rashid sees **Sample orders** separate from **Trips** / PO orders.
- [ ] Regular batch assignment routes reject `field_sample` orders (or redirect to sample route).
</must_haves>

<tasks>
  <task id="T1" title="Sample orders list page">
    <step>Create `app/(app)/dispatch/sample-orders/page.tsx` — table: reference, customer, rep, products, batch progress, link to assign sheet.</step>
    <step>Query `orderKind: field_sample` + `rashidActiveOrdersMongoFilter` or sample-specific status.</step>
  </task>

  <task id="T2" title="Sample batch assignment sheet">
    <step>Add `app/(app)/dispatch/sample-orders/[id]/loading-sheet/page.tsx` reusing `TripBatchAssignmentSheet` with `batchPool="sample"`.</step>
    <step>Extend batch options loader to use `sampleProductionBatchMongoFilter` + remaining liters helper.</step>
  </task>

  <task id="T3" title="Deduct on assign save">
    <step>In batch-assignments PATCH: if `orderKind === field_sample` and all batches complete, call `deductSampleProduction` if not yet deducted.</step>
    <step>Pass `visitTicketId` from order.fieldVisitTicketId; block save if insufficient sample stock.</step>
  </task>

  <task id="T4" title="Nav + access">
    <step>Add Sample orders link for Rashid/admin in dispatch nav.</step>
    <step>Exclude sample orders from `/dispatch/po-orders` and Rashid regular trip batch links.</step>
  </task>
</tasks>

<verification>
- Approved visit → visible on `/dispatch/sample-orders`.
- Rashid assigns sample batch → Esha sample pool decreases.
- Regular PO assign still uses regular batches only.
- `npm run build` passes.
</verification>
