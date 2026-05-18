---
wave: 3
depends_on: ["16-packaging-inventory/02-PLAN.md"]
gap_closure: false
files_modified:
  - ".planning/ROADMAP.md"
  - "lib/packagingCatalog.ts"
autonomous: true
---

<phase_goal>
Document **Phase 17** hook for auto-deducting packaging when production/orders consume bottles — without implementing deduction in Phase 16.
</phase_goal>

<must_haves>
- [ ] ROADMAP entry for **Phase 17: Packaging auto-deduct** (planned, not executed).
- [ ] `lib/packagingCatalog.ts` stub: types + `packagingNeedsForSheetLine()` returning empty array (placeholder for future ProductPacking → packaging BOM map).
- [ ] Comment in PackagingItem schema or seed JSON: optional `linkedProductCode` field reserved for v2.
</must_haves>

<tasks>
  <task id="1" name="future-hook">
    <step>Add optional `linkedProductCode` on PackagingItem schema (unused in UI v1).</step>
    <step>Create `lib/packagingCatalog.ts` with `PackagingNeed { itemCode, quantity }` and stub `needsForOrderLine(...)` returning [].</step>
    <step>Append Phase 17 blurb to ROADMAP.md (auto-deduct on fill/dispatch).</step>
  </task>
</tasks>

<verification>
- Build passes; no behavior change in Phase 16 UI.
</verification>
