---
wave: 1
depends_on: []
gap_closure: false
files_modified:
  - "app/api/admin/field-visit-samples/[id]/route.ts"
  - "app/api/field-visits/[id]/route.ts"
  - "lib/fieldVisitTickets.ts"
autonomous: true
---

<phase_goal>
When **Waleed approves** an outgoing sample request, auto-create a **sample order** for Rashid. **Stop** deducting Esha stock on rep request.
</phase_goal>

<must_haves>
- [ ] On `approve` + `outgoing`: create `Order` with `orderKind: field_sample`, link `fieldVisitTicketId` both ways.
- [ ] Ticket gets `sampleDispatchStatus: "awaiting_batches"` (or equivalent).
- [ ] Remove `deductSampleProduction` from `request_sample_approval` in field-visits API.
- [ ] Remove `restoreSampleProductionForVisit` on reject unless stock was already deducted (guard with `sampleStockDeductedAt`).
- [ ] Re-approve after reject creates new order only if none active linked.
- [ ] Field visit UI copy: stock deducts when Rashid assigns batches, not on request.
</must_haves>

<tasks>
  <task id="T1" title="Approve → sample order">
    <step>In `field-visit-samples/[id]/route.ts` approve branch: if outgoing, call `createSampleOrderForApprovedVisit(ticket)`.</step>
    <step>Persist `linkedOrderId` on ticket; set order `approvalStatus: approved` (skip Waleed PO approval).</step>
  </task>

  <task id="T2" title="Remove early stock deduct">
    <step>Delete deduct block from `request_sample_approval` in `field-visits/[id]/route.ts`.</step>
    <step>Update `FieldVisitDetailForm` step-1 text to mention Rashid assignment deducts stock.</step>
  </task>

  <task id="T3" title="Reject handling">
    <step>On reject: if linked sample order exists and batches not assigned, delete or mark order cancelled.</step>
    <step>Do not restore sample stock unless `sampleStockDeductedAt` set.</step>
  </task>
</tasks>

<verification>
- Approve outgoing visit → sample order appears in DB with correct lines.
- Request sample does not change Esha sample pool.
- `npm run build` passes.
</verification>
