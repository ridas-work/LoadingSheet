---
wave: 1
depends_on: []
gap_closure: false
files_modified:
  - "lib/models/ChemicalIntake.ts"
  - "lib/models/ChemicalStockMovement.ts"
  - "lib/chemicalStock.ts"
  - "lib/chemicalMaterials.ts"
  - "lib/roles.ts"
autonomous: true
---

<phase_goal>
**Chemical intake ledger + stock math** — schema, movement audit, approve validation helpers. No UI yet.
</phase_goal>

<must_haves>
- [ ] `ChemicalIntake` model — material, quantity, QC fields, outcome, actor, receivedAt
- [ ] `ChemicalStockMovement` model — `intake` | `request_approved` | `admin_adjust`, delta, onHandAfter, reference
- [ ] `lib/chemicalStock.ts` — `addIntakeToStock({ materialCode, quantity, intakeId, actor })`, `deductForApprovedRequest({ request, actor })`, `validateStockForApprove(material, qtyRequested)`
- [ ] Approve validation returns clear shortage message with onHand vs requested
- [ ] `canRecordChemicalIntake(batch_editor + admin)`; `canEditChemicalStock` → **admin only**
</must_haves>

<tasks>
  <task id="1" name="schema">
    <step>Create `ChemicalIntake` and `ChemicalStockMovement` Mongoose schemas.</step>
    <step>Export serializers in `lib/chemicalMaterials.ts` or `lib/chemicalStock.ts`.</step>
  </task>

  <task id="2" name="stock-lib">
    <step>Implement atomic `$inc` on `ChemicalRawMaterial.onHand` for intake (+) and approve (-).</step>
    <step>Write movement row after each change with `onHandAfter` snapshot.</step>
    <step>`validateStockForApprove` — `onHand >= quantityRequested` or structured error.</step>
  </task>

  <task id="3" name="roles">
    <step>Add `canRecordChemicalIntake` to `lib/roles.ts`.</step>
    <step>Change `canEditChemicalStock` to admin-only (remove `chemicals_editor`).</step>
  </task>
</tasks>

<verification>
- Unit smoke: intake +50 → onHand increases; deduct 20 → onHand decreases; movement rows created.
- `validateStockForApprove` fails when onHand &lt; requested.
- `npm run build` passes.
</verification>
