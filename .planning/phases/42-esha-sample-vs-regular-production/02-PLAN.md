---
wave: 2
depends_on: ["42-esha-sample-vs-regular-production/01-PLAN.md"]
gap_closure: false
files_modified:
  - "app/api/production-batches/route.ts"
  - "app/api/production-batches/[id]/route.ts"
  - "lib/productionBatchApi.ts"
  - "components/ProductionBatchForm.tsx"
  - "app/(app)/production/batches/page.tsx"
  - "app/(app)/production/batches/new/page.tsx"
  - "app/(app)/production/batches/[id]/edit/page.tsx"
autonomous: true
---

<phase_goal>
Esha can **choose Regular vs Sample production** when registering batches; lists are split/filtered with remaining sample liters visible.
</phase_goal>

<must_haves>
- [ ] `POST /api/production-batches` accepts `productionPurpose` (`regular` | `sample`); default `regular`
- [ ] `PATCH /api/production-batches/[id]` allows purpose change only when batch not locked in use (same rules as other fields)
- [ ] `GET /api/production-batches` supports `?purpose=regular|sample|all` (default `all` for Esha page)
- [ ] `ProductionBatchForm` — purpose selector: **Regular production** / **Sample production** with short help text
- [ ] `/production/batches` — tabs or segmented control: **Regular** | **Sample** | **All**; badge on each row
- [ ] Sample rows show **remaining sample liters** (from wave 1 lib)
- [ ] New batch page respects tab context (pre-select purpose when opened from Sample tab)
</must_haves>

<tasks>
  <task id="1" name="api">
    <step>Wire `productionPurpose` through create/update handlers and `productionBatchApi.ts` types.</step>
    <step>Validate enum; reject unknown values.</step>
    <step>List endpoint: optional purpose filter + include `remainingSampleLiters` computed field for sample batches.</step>
  </task>

  <task id="2" name="esha-ui">
    <step>Add purpose field to `ProductionBatchForm` (disabled when `lockedInUse`).</step>
    <step>Update batches list page with filter tabs and purpose badge.</step>
    <step>Pass `initialProductionPurpose` on new/edit pages.</step>
  </task>

  <task id="3" name="docs-copy">
    <step>Helper text: “Sample production is for field visit samples only — not used on customer PO loading sheets.”</step>
  </task>
</tasks>

<verification>
- Esha creates sample batch → appears under Sample tab only; not in Rashid assign dropdown (manual check).
- Edit sample batch QC fields still works.
- `npm run build` passes.
</verification>
