---
wave: 2
depends_on: ["23-rashid-bottle-filling-readiness/01-PLAN.md"]
gap_closure: false
files_modified:
  - "components/BatchFillingGrid.tsx"
  - "app/(app)/dispatch/filling/page.tsx"
  - "app/(app)/admin/page.tsx"
  - "README.md"
  - ".planning/STATE.md"
autonomous: true
---

<phase_goal>
Update Rashid/admin daily filling screens so the editable operational fields are **bottle counts**, not liters, and “ready to deliver” clearly means fully finished stock.
</phase_goal>

<must_haves>
- [ ] **Rashid UI labels:** Replace editable columns `Filled today (L)` and `Ready to deliver (L)` with `Filled today (bottles)` and `Ready to deliver (bottles)`.
- [ ] **Ready help text:** Explain that ready-to-deliver bottles are fully finished: capped, labeled/stickered, packed/finished, and ready to leave with dispatch.
- [ ] **Packing picker:** Each entry line has a product/packing dropdown sourced from API `packingOptions`, because bottle-to-liter conversion depends on bottle size.
- [ ] **Multiple packing lines:** UI allows adding more than one packing line for the same batch/day when one liquid batch was filled into multiple pack sizes.
- [ ] **Keep reconciliation visible:** Keep Nimra remaining, physical remaining, and variance in liters; show derived filled/ready liter snapshots as secondary read-only text where useful.
- [ ] **Admin read-only:** Admin daily filling visibility shows bottle counts plus derived liters; admin cannot edit.
- [ ] **Autosave behavior:** Preserve current save-on-blur or explicit row save behavior; avoid saving half-selected packing rows.
- [ ] **Docs:** README workflow updates `/dispatch/filling` description to bottle counts and ready-stock definition.
</must_haves>

<tasks>
  <task id="1" name="grid-types-and-state">
    <step>Update `BatchFillingGrid` types from single liter fields to `packingLines` state with `productCode`, `filledBottlesToday`, and `readyToDeliverBottles` strings.</step>
    <step>Initialize state from API response; preserve legacy entries by displaying old liter-only data as historical/read-only or mapped fallback.</step>
  </task>

  <task id="2" name="rashid-entry-ui">
    <step>Render one or more packing lines under each batch: packing dropdown, filled bottles, ready bottles, remove line, add line.</step>
    <step>Keep `Physical remaining (L)` at the batch row level unless operations explicitly asks to change it later.</step>
    <step>Show derived totals like `Filled: X L` and `Ready: Y L` in small secondary text so Rashid enters bottles but variance remains understandable.</step>
  </task>

  <task id="3" name="save-and-validation">
    <step>Build PATCH payload from packing lines; omit blank lines; block save if a line has bottles but no product/packing selected.</step>
    <step>Validate bottle counts as whole numbers ≥ 0 on the client before sending.</step>
    <step>Handle API errors inline per batch row, preserving current saved/saving/error status feedback.</step>
  </task>

  <task id="4" name="copy-docs-admin">
    <step>Update `/dispatch/filling` page intro: Rashid records bottles filled today, bottles fully ready to deliver, and physical liquid remaining for reconciliation.</step>
    <step>Update admin read-only copy to clarify bottle counts are operational values while variance is still liters.</step>
    <step>Update `README.md` workflow bullet for `/dispatch/filling`.</step>
  </task>
</tasks>

<verification>
- `npm run build` passes.
- Rashid can add one packing line, select a product, enter filled bottles + ready bottles, blur/save, refresh, and see the same values.
- Rashid can add two packing lines for one batch/day with different pack sizes and the API stores both.
- Ready-to-deliver copy appears near the input, not only in docs.
- Admin view shows bottle counts and derived liters without edit controls.
</verification>
