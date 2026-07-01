---
wave: 3
depends_on: ["44-esha-chemical-qc-intake/02-PLAN.md"]
gap_closure: false
files_modified:
  - "app/(app)/production/chemical-intake/page.tsx"
  - "components/ChemicalIntakeForm.tsx"
  - "components/ChemicalMaterialsPortal.tsx"
  - "components/AdminChemicalRequestsTable.tsx"
  - "app/(app)/layout.tsx"
  - "app/(app)/chemicals/inventory/page.tsx"
autonomous: true
---

<phase_goal>
**Portals** — Esha chemical QC intake UI; Ramazan read-only stock; Waleed sees live stock + shortage errors on approve.
</phase_goal>

<must_haves>
- [ ] `/production/chemical-intake` — Esha: material search, QC form, quantity, Successful/Unsuccessful, recent intakes table
- [ ] Nav: Esha (`batch_editor`) sees **Chemical intake** under production area
- [ ] Ramazan `/chemicals/inventory` — stock column **read-only** (no save stock button)
- [ ] Waleed `/admin/chemical-requests` — show **current onHand** per row; approve shows API shortage error inline
- [ ] Admin on chemicals inventory: optional **Adjust stock** for Waleed refill (uses admin PATCH + movement)
- [ ] Build + `pm2 restart loadingsheet`
</must_haves>

<tasks>
  <task id="1" name="esha-ui">
    <step>Create `ChemicalIntakeForm.tsx` — material picker from GET `/api/chemical-materials` (read for batch_editor).</step>
    <step>Create `production/chemical-intake/page.tsx` with form + recent intakes list.</step>
    <step>Allow `batch_editor` GET on `/api/chemical-materials` (read-only catalog).</step>
  </task>

  <task id="2" name="ramazan-readonly">
    <step>Update `ChemicalMaterialsPortal.tsx` — when `readOnly` false but role is chemicals_editor only: hide stock edit, show stock as text.</step>
    <step>Keep Request modal unchanged.</step>
  </task>

  <task id="3" name="waleed-ui">
    <step>`AdminChemicalRequestsTable` — fetch/display current onHand per material (from materials list or API field).</step>
    <step>Highlight row red when onHand &lt; quantityRequested and pending.</step>
    <step>Surface approve error message from API (shortage text).</step>
    <step>Admin adjust stock UI on `/chemicals/inventory` when role is admin.</step>
    <step>Add layout nav link for Esha.</step>
  </task>
</tasks>

<verification>
- Esha: record successful intake → Ramazan sees higher stock.
- Ramazan: cannot edit stock directly.
- Waleed: cannot approve when stock low; after Esha intake or admin adjust, approve succeeds and stock drops.
- `npm run build` && deploy.
</verification>
