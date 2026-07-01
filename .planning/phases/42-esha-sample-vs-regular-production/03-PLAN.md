---
wave: 3
depends_on: ["42-esha-sample-vs-regular-production/02-PLAN.md"]
gap_closure: false
files_modified:
  - "app/api/field-visits/[id]/route.ts"
  - "components/FieldVisitDetailForm.tsx"
  - "components/AdminFieldVisitSampleApprovalsTable.tsx"
  - "app/api/admin/field-visit-samples/[id]/route.ts"
  - "README.md"
  - ".planning/STATE.md"
autonomous: true
---

<phase_goal>
Field visit **outgoing sample delivery** deducts from Esha’s **sample production pool**; reps can enter qty per sample line; Waleed sees stock context on approval.
</phase_goal>

<must_haves>
- [ ] `record_sample_event` + `sampleMode === "outgoing"` calls `deductSampleProduction` **before** saving delivery timestamps
- [ ] Insufficient sample stock → **400** with product-level message; ticket not updated
- [ ] Incoming sample mode (`incoming`) — **no** sample pool deduction
- [ ] `FieldVisitDetailForm` — optional **qty (bottles)** per sample product line (default 1) on request + delivery steps
- [ ] Waleed field visit approval card shows **sample stock available** per requested product (read-only, from `samplePoolForCatalog`)
- [ ] `GET /api/sample-production-stock` or include in existing field-visit GET for rep delivery banner (optional: “Stock OK” / “Low stock”)
- [ ] README + STATE updated; `npm run build` + deploy
</must_haves>

<tasks>
  <task id="1" name="field-visit-deduct">
    <step>In `app/api/field-visits/[id]/route.ts` `record_sample_event` branch: after approval check, if outgoing, call deduct helper with `ticket.sampleProducts`.</step>
    <step>On success, proceed with existing delivery/feedback fields.</step>
    <step>Idempotency: if ticket already has `sampleDeliveredAt` set, skip re-deduct (or block duplicate delivery).</step>
  </task>

  <task id="2" name="rep-ui-qty">
    <step>Extend sample product input in `FieldVisitDetailForm` — product name + bottles (default 1).</step>
    <step>Serialize `bottles` in `request_sample_approval` and `record_sample_event` payloads.</step>
    <step>Show low-stock warning before delivery if pool check fails (client preflight optional).</step>
  </task>

  <task id="3" name="admin-visibility">
    <step>On `AdminFieldVisitSampleApprovalsTable`, show per-line sample stock available next to requested products.</step>
    <step>Admin approval does not deduct — only delivery does.</step>
  </task>

  <task id="4" name="deploy">
    <step>Update README workflow section (Esha sample vs regular, field visit deduction).</step>
    <step>Update `.planning/STATE.md` — Phase 42 planned → complete after UAT.</step>
    <step>`npm run build && pm2 restart loadingsheet`.</step>
  </task>
</tasks>

<verification>
- Esha: sample batch 10 L Brighten registered.
- Rep: approved request → record outgoing delivery 1× Brighten → sample pool −1 L (or catalog liters).
- Rashid: same product regular batch still full liters for PO assign.
- Duplicate delivery blocked or idempotent.
- Build passes.
</verification>
