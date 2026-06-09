---
wave: 3
depends_on: ["30-standard-carton-weight-check/02-PLAN.md", "21-gate-guard-zaman/01-PLAN.md"]
gap_closure: false
files_modified:
  - "lib/gateDelivery.ts"
  - "lib/standardCartonWeight.ts"
  - "app/api/gate/orders/route.ts"
  - "components/GateOrdersTable.tsx"
autonomous: true
---

<phase_goal>
Orders only reach **Zaman’s gate list** when every **standard** carton row has a **passed** weight check — vehicle cannot “leave” digitally until Rashid finished weighing.
</phase_goal>

<must_haves>
- [ ] `allStandardCartonWeightsValid(sheetLines, catalog)` helper.
- [ ] Extend `gateEligibleMongoFilter()` OR post-filter gate API: trip + dispatch header complete + weights valid.
- [ ] Gate UI: if order blocked for missing weights, Rashid sees note on loading sheet (“Enter carton weights before gate”).
- [ ] Delivered / legacy orders unaffected.
</must_haves>

<tasks>
  <task id="1" name="gate-filter">
    <step>Add weight-complete check; document in README gate step.</step>
    <step>Optional: `weightsVerifiedAt` timestamp when all standard rows pass (set on successful batch-assignments save).</step>
  </task>
</tasks>

<verification>
- PO on trip with vehicle/driver/DC but missing kg → **not** on Zaman active list.
- After Rashid enters valid weights → appears on gate.
- UAT with one standard product row.
</verification>
