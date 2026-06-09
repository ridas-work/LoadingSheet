---
wave: 2
depends_on: ["30-standard-carton-weight-check/01-PLAN.md"]
gap_closure: false
files_modified:
  - "components/LoadingSheetBatchEditor.tsx"
  - "app/api/orders/[id]/batch-assignments/route.ts"
  - "app/(app)/orders/[id]/loading-sheet/page.tsx"
  - "README.md"
autonomous: true
---

<phase_goal>
Rashid **enters weighed kg per carton** on the loading sheet in dispatch edit mode; **save is blocked** if any standard line is outside ±8% tolerance.
</phase_goal>

<must_haves>
- [ ] Dispatch edit UI: per-row **input** for `cartonWeightKg` (kg); show **standard** hint when lookup hits (e.g. “Std 17.4 kg”).
- [ ] Keep **Weight (L)** column as auto liters (unchanged); add or relabel kg column **Carton wt (kg)** so Rashid is not confused.
- [ ] Client-side validation on save with row-level error list.
- [ ] `PATCH /api/orders/[id]/batch-assignments` accepts `cartonWeights: [{ boxNo, cartonWeightKg }]`; server re-validates; persists on `sheetLines`.
- [ ] Rows without standard: input optional; no validation block.
- [ ] Print view shows entered kg when set.
- [ ] README: Rashid weighs each box before trip leaves; ±8% vs standard list.
</must_haves>

<tasks>
  <task id="1" name="ui-inputs">
    <step>State `cartonWeights: Record<boxNo, string>` in `LoadingSheetBatchEditor`.</step>
    <step>Show editable number input only when `showBatchInputs` (Rashid dispatch edit).</step>
    <step>Inline error under row when out of tolerance (live on blur optional).</step>
  </task>
  <task id="2" name="save-flow">
    <step>Extend save payload with carton weights; validate before fetch.</step>
    <step>API: merge weights into sheet lines after batch assignment; return 400 with `{ errors: { "box.3": "..." } }` on fail.</step>
  </task>
  <task id="3" name="loading-sheet-page">
    <step>Pass `cartonWeightKg` from order into editor props.</step>
  </task>
</tasks>

<verification>
- Rashid: Rhino 500ml row, enter 17.4 → save OK.
- Enter 20.0 → error “check the box again”.
- Mixed/custom row: save without kg OK.
- `npm run build` passes.
</verification>
