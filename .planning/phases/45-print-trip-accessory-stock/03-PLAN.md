---
wave: 2
depends_on: []
gap_closure: false
files_modified:
  - "lib/models/ChemicalRawMaterial.ts"
  - "lib/models/ChemicalMaterialRequest.ts"
  - "lib/chemicalMaterials.ts"
  - "lib/chemicalStock.ts"
  - "app/api/chemical-materials/route.ts"
  - "app/api/chemical-material-requests/route.ts"
  - "app/api/admin/chemical-material-requests/[id]/route.ts"
autonomous: true
---

<phase_goal>
Extend chemical-material stock to include optional accessory stock for shoppers, drums, and seals, so Ramazan can request them with a chemical request and Waleed approval is blocked when any requested item has insufficient stock.
</phase_goal>

<must_haves>
- [ ] Esha/admin can maintain stock entries for shoppers, drums, and seals.
- [ ] Ramazan can request chemical quantity and optional separate accessory quantities.
- [ ] Accessory requests are optional; chemical-only requests still work.
- [ ] Waleed approval checks chemical stock and every requested accessory stock line.
- [ ] If any requested stock is insufficient, approval returns a clear item-specific error.
- [ ] Approval deducts chemical and accessory stock without partial approval.
- [ ] Request serialization includes accessory lines for Ramazan and Waleed UI.
</must_haves>

<data_model>
Use the current chemical stock system unless implementation reveals a strong reason to separate it.

Recommended approach:
- Add `kind` to `ChemicalRawMaterial`: `chemical` or `accessory`; default old rows to `chemical`.
- Seed or allow creation of accessory rows for `shoppers`, `drums`, and `seals`, all with unit `pcs`.
- Add `accessories[]` to `ChemicalMaterialRequest`: `itemCode`, `itemName`, `quantityRequested`, `unit`, `onHandAtRequest`.
</data_model>

<tasks>
  <task id="T1" title="Schema extension">
    <step>Add `kind` to `ChemicalRawMaterial` with default `chemical`.</step>
    <step>Add `accessories[]` subdocument to `ChemicalMaterialRequest`.</step>
    <step>Ensure old request documents serialize with `accessories: []`.</step>
  </task>

  <task id="T2" title="Serializers and helpers">
    <step>Extend `SerializedChemicalMaterial` with `kind`.</step>
    <step>Extend `SerializedChemicalRequest` with `accessories`.</step>
    <step>Add helper constants for accessory codes/names: shoppers, drums, seals.</step>
    <step>Make material creation accept `kind`, defaulting to `chemical`.</step>
  </task>

  <task id="T3" title="Stock validation and deduction">
    <step>Add combined approval validation in `lib/chemicalStock.ts` that checks the main chemical and accessory lines.</step>
    <step>Return a structured shortage list with item name, requested, onHand, and unit.</step>
    <step>Extend approval deduction to deduct all requested lines using conditional updates (`onHand >= qty`).</step>
    <step>Prefer a Mongo transaction if available; otherwise validate first and revert request status to pending on deduction failure.</step>
  </task>

  <task id="T4" title="Request API">
    <step>Update `POST /api/chemical-material-requests` to parse optional `accessories` from the request body.</step>
    <step>Validate each accessory quantity is numeric and greater than 0 when provided.</step>
    <step>Look up accessory stock rows and store snapshots on the request.</step>
    <step>Reject unknown accessory codes with a clear error.</step>
  </task>

  <task id="T5" title="Approval API">
    <step>Update `app/api/admin/chemical-material-requests/[id]/route.ts` approval branch to use combined validation.</step>
    <step>Return HTTP 400 with messages like `Cannot approve - Drums stock is less. On hand: 0 pcs, requested: 2 pcs.`</step>
    <step>On success, deduct chemical and every requested accessory and create movement records.</step>
    <step>Keep reject and mark ordered behavior unchanged.</step>
  </task>
</tasks>

<verification>
- Existing chemical-only request still creates, displays, and approves when stock is enough.
- Request with shoppers/drums/seals persists accessory lines with on-hand snapshots.
- Waleed approval fails if chemical stock is short.
- Waleed approval fails if any accessory stock is short, naming the specific item.
- Waleed approval succeeds only when all requested stock lines are sufficient and deducts each line.
- `npm run build` passes.
</verification>
