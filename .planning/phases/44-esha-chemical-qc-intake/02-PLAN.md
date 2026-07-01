---
wave: 2
depends_on: ["44-esha-chemical-qc-intake/01-PLAN.md"]
gap_closure: false
files_modified:
  - "app/api/chemical-intakes/route.ts"
  - "app/api/admin/chemical-material-requests/[id]/route.ts"
  - "app/api/chemical-materials/[code]/route.ts"
autonomous: true
---

<phase_goal>
**APIs** — Esha records QC intake; Waleed approve deducts stock or returns shortage error.
</phase_goal>

<must_haves>
- [ ] `POST /api/chemical-intakes` — `batch_editor` only; body: materialCode, quantity, qcOutcome, QC fields, receivedAt
- [ ] Successful intake → `addIntakeToStock`; rejected → intake doc only
- [ ] `GET /api/chemical-intakes` — recent intakes for Esha list (limit 50)
- [ ] Admin `approve` action: run `validateStockForApprove` then `deductForApprovedRequest` in one flow; 400 on shortage
- [ ] Admin PATCH `onHand` on chemical-materials logs `admin_adjust` movement (Waleed refill)
- [ ] Reject / mark_ordered unchanged except no stock change on reject
</must_haves>

<tasks>
  <task id="1" name="intake-api">
    <step>Create `app/api/chemical-intakes/route.ts` GET + POST.</step>
    <step>Validate material exists and quantity &gt; 0.</step>
    <step>Parse qcOutcome approved/rejected; require QC comment on rejected.</step>
  </task>

  <task id="2" name="approve-deduct">
    <step>Update `app/api/admin/chemical-material-requests/[id]/route.ts` approve branch.</step>
    <step>Load fresh `ChemicalRawMaterial.onHand` before validate.</step>
    <step>On success return updated request + new onHand in response.</step>
  </task>

  <task id="3" name="admin-adjust">
    <step>When admin PATCHes onHand, compute delta vs previous and log `admin_adjust` movement.</step>
  </task>
</tasks>

<verification>
- POST intake approved → material onHand increases.
- Approve request with onHand &lt; qty → 400 with shortage message.
- Approve with sufficient stock → onHand decreases by requested qty.
- `npm run build` passes.
</verification>
