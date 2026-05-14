---
wave: 2
depends_on: ["10-production-batch-qc-fields/01-PLAN.md"]
gap_closure: false
files_modified:
  - "components/ProductionBatchForm.tsx"
  - "app/(app)/production/batches/page.tsx"
  - "app/(app)/production/batches/[id]/edit/page.tsx"
  - "app/(app)/production/batches/[id]/page.tsx"
  - "README.md"
autonomous: true
---

<phase_goal>
Nimra's **Add / Edit batch** form and list match the spreadsheet columns; staff can **view full batch record** for future feedback checks.
</phase_goal>

<user_flow>
1. Nimra → **Production batches** → **Add batch**.
2. Form fields (aligned to manual sheet): **Product** (family), **Date**, **Batch#**, **pH**, **Solids**, **Appearance**, **Provider**, **Drum**, **Quantity**, **Total liters** (for dispatch pool).
3. Save → all values stored; list shows key columns.
4. **View** row (or edit) → read-only detail of every field + who created / when.
5. Rashid unchanged except batch dropdown now respects product families.
</user_flow>

<must_haves>
- [ ] `ProductionBatchForm` — inputs for all Nimra fields; product dropdown uses **batch families** only.
- [ ] Remove prominent **Notes** field from form (legacy data still in DB).
- [ ] Batches list table: batch no, product, date, ph, quantity, liters (responsive; horizontal scroll OK).
- [ ] Batch **detail page** `/production/batches/[id]` — full audit view for dispute lookup.
- [ ] Edit page passes initial values for all new fields.
- [ ] README Nimra workflow mentions QC fields and Power Wash family rule.
</must_haves>

<tasks>
  <task id="1" name="form">
    <step>Rewrite `ProductionBatchForm` props + state for ph, solids, appearance, provider, drum, quantity.</step>
    <step>Fetch families from `/api/products`; validate client-side non-empty strings.</step>
    <step>Helper text under Quantity vs Total liters explaining roles.</step>
  </task>

  <task id="2" name="list-and-detail">
    <step>Update batches list columns.</step>
    <step>Add `app/(app)/production/batches/[id]/page.tsx` read-only detail (batch_editor + dispatch_editor can view).</step>
    <step>Link batch no in list → detail; Edit from detail or row actions.</step>
  </task>

  <task id="3" name="docs">
    <step>README workflow bullet for Nimra QC fields.</step>
  </task>
</tasks>

<out_of_scope>
- Export batch registry to Excel.
- QC fields on printed loading sheet.
</out_of_scope>

<verification>
- Nimra can enter values matching spreadsheet example row; reload edit form shows same text.
- Open batch detail after save — all fields visible.
- `npm run build` passes.
</verification>
