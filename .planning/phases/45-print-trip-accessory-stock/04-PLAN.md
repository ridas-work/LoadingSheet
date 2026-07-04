---
wave: 3
depends_on: ["45-print-trip-accessory-stock/03-PLAN.md"]
gap_closure: false
files_modified:
  - "app/(app)/chemicals/inventory/page.tsx"
  - "app/(app)/production/chemical-intake/page.tsx"
  - "components/ChemicalMaterialsPortal.tsx"
  - "components/ChemicalIntakeForm.tsx"
  - "components/AdminChemicalRequestsTable.tsx"
autonomous: true
---

<phase_goal>
Expose accessory stock and requests clearly in the UI: Esha can maintain shoppers/drums/seals stock, Ramazan can optionally request them with a chemical, and Waleed sees/accesses approval blocking errors before approval.
</phase_goal>

<must_haves>
- [ ] Esha portal shows stock entry for shoppers, drums, and seals.
- [ ] Ramazan request modal has separate optional fields for shoppers, drums, and seals.
- [ ] Leaving accessory fields blank or zero creates a normal chemical-only request.
- [ ] Waleed requests table shows requested accessories and current stock.
- [ ] Waleed sees a clear red shortage message and cannot approve when chemical or accessory stock is insufficient.
- [ ] Existing chemical intake/history UX remains usable.
</must_haves>

<tasks>
  <task id="T1" title="Esha accessory stock UI">
    <step>Decide whether to show accessory stock inside `/production/chemical-intake` or reuse `/chemicals/inventory` with Esha permissions.</step>
    <step>Recommended: add a small `Accessory stock` card to Esha's chemical intake page that lists shoppers, drums, and seals.</step>
    <step>Allow Esha to enter/update on-hand stock for accessory rows only, not arbitrary chemical stock unless existing business rules allow it.</step>
    <step>Use the same `/api/chemical-materials` APIs from plan 03.</step>
  </task>

  <task id="T2" title="Ramazan request form">
    <step>In `ChemicalMaterialsPortal`, extend the request modal with an `Optional packing/accessories` section.</step>
    <step>Add number inputs: shoppers, drums, seals. Make them optional and default blank.</step>
    <step>Submit only accessories with quantity greater than 0 in the `accessories` array.</step>
    <step>Show helper text: `Only fill these if needed for this chemical request.`</step>
  </task>

  <task id="T3" title="Ramazan request history">
    <step>In recent requests, show accessory summary under the chemical line, e.g. `Accessories: 10 shoppers, 2 drums`.</step>
    <step>Keep the main quantity column focused on the chemical quantity.</step>
  </task>

  <task id="T4" title="Waleed approval table">
    <step>In `AdminChemicalRequestsTable`, display accessory lines below each request's chemical name or in a compact details column.</step>
    <step>Load current stock for accessory codes and compare with requested accessory quantities.</step>
    <step>When any shortage exists, show a red message naming each short item.</step>
    <step>Disable the Approve button for known shortages, while still keeping the API as the source of truth.</step>
    <step>If the API returns a shortage error, display it at the top and keep the request pending.</step>
  </task>

  <task id="T5" title="Copy and labels">
    <step>Use factory wording: `Shoppers`, `Drums`, `Seals`, `pcs`.</step>
    <step>Use `stock is less` or a polished equivalent such as `Insufficient stock` consistently.</step>
    <step>Do not call accessories compulsory; label the section optional.</step>
  </task>
</tasks>

<verification>
- Esha can set shoppers/drums/seals stock from her portal.
- Ramazan can request only a chemical with no accessory fields filled.
- Ramazan can request a chemical plus shoppers/drums/seals quantities.
- Waleed sees requested accessory quantities before approval.
- Waleed cannot approve when shoppers/drums/seals are zero or below requested quantities.
- Waleed can approve after Esha increases the accessory stock.
- `npm run build` passes.
</verification>
