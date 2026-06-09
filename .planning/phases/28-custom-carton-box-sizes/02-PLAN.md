---
wave: 2
depends_on: ["28-custom-carton-box-sizes/01-PLAN.md"]
gap_closure: false
files_modified:
  - "components/CustomCartonBuilder.tsx"
  - "app/(app)/new-order/page.tsx"
  - "components/AdminOrderEditForm.tsx"
  - "app/(app)/orders/[id]/edit/page.tsx"
  - "README.md"
  - ".planning/REQUIREMENTS.md"
autonomous: true
---

<phase_goal>
PO team and admin **choose custom outer box size** when defining custom cartons; legacy orders can be corrected without re-entering contents.
</phase_goal>

<must_haves>
- [ ] `CustomCartonDraft` includes `customBoxCode` (default empty → validation blocks submit).
- [ ] Each custom carton card shows **Outer box size** `<select>` with five options from `CUSTOM_CARTON_BOX_OPTIONS`.
- [ ] `buildCustomCartonsPayload` / submit body sends `customBoxCode` per carton.
- [ ] Validation errors surface on the carton card (`customCartons.{i}.customBoxCode`).
- [ ] `draftsFromSavedCartons` restores saved `customBoxCode`.
- [ ] `AdminOrderEditForm` + edit page load/save `customBoxCode`; rebuild sheet lines on save.
- [ ] README + REQUIREMENTS: custom cartons require outer box size; list five sizes; Haider tracks `custom-box-*` SKUs.
- [ ] Help copy: standard product cartons use product boxes; **custom carton** uses size-based outer box only.
</must_haves>

<tasks>
  <task id="1" name="custom-carton-builder-ui">
    <step>Add `customBoxCode: string` to `CustomCartonDraft`; `emptyCartonDraft()` default `""`.</step>
    <step>Render required select above or below “How many identical cartons?” with labels: 5 L jar, 1 L, 500 ml, 250 ml, 100 ml.</step>
    <step>Show field-level error from parent `errors` prop pattern used for `boxCount`.</step>
    <step>`draftsFromSavedCartons`: map `customBoxCode` from saved order.</step>
  </task>

  <task id="2" name="new-order-wire-up">
    <step>`buildCustomCartonsPayload` includes `customBoxCode` per carton.</step>
    <step>Client validation: each custom carton must have valid `customBoxCode` before submit (match server messages).</step>
    <step>Scroll/focus first error includes custom box field.</step>
  </task>

  <task id="3" name="admin-edit">
    <step>Load `customBoxCode` on edit page into `AdminOrderEditForm` custom carton drafts.</step>
    <step>PATCH order payload preserves `customBoxCode`; sheet lines rebuild with stamped `customBoxCode` on mixed rows.</step>
  </task>

  <task id="4" name="legacy-orders">
    <step>Orders with custom cartons missing `customBoxCode`: admin edit shows empty select with warning banner “Select outer box size before next delivery.”</step>
    <step>Optional helper `suggestCustomBoxCodeFromContents(contents, catalog)` — pre-select dropdown from largest `litersPerBottle` in carton (user can override); implement if low effort.</step>
  </task>

  <task id="5" name="docs">
    <step>README workflow bullet under custom cartons.</step>
    <step>REQUIREMENTS.md Phase 28 section (brief).</step>
  </task>
</tasks>

<verification>
- Create hybrid PO: standard lines + custom carton with **CUSTOM BOX 500 ML** → order saves; loading sheet mixed row has `customBoxCode` in DB.
- Edit order: change to **1 L** → sheet lines update; gate preview deducts 1L box on Nimra-filled custom lines.
- Submit blocked when custom carton exists but box size unset.
- `npm run build` passes.
</verification>
