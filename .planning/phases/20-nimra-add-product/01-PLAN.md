---
wave: 1
depends_on: ["18-admin-order-edit/03-PLAN.md"]
gap_closure: false
files_modified:
  - "app/api/product-packings/route.ts"
  - "lib/productPackingValidation.ts"
autonomous: true
---

<phase_goal>
**Nimra (`batch_editor`)** can **POST** a new `ProductPacking` row with validated fields and unique `code`.
</phase_goal>

<must_haves>
- [ ] `POST /api/product-packings` — `batch_editor` only; 403 for others.
- [ ] Validates: non-empty name, code (slug a-z0-9-), bottlesPerCarton ≥ 1, litersPerBottle > 0 (or infer from name).
- [ ] `batchFamily` optional; default to trimmed `name` when empty (single-SKU family).
- [ ] Unique code — 409 if exists.
- [ ] `GET` unchanged or extended if needed for list after add.
</must_haves>

<tasks>
  <task id="1" name="validation-helper">
    <step>Add `lib/productPackingValidation.ts` with parse/validate for create body.</step>
  </task>
  <task id="2" name="post-api">
    <step>Create `app/api/product-packings/route.ts` with POST; connectToDatabase; ProductPacking.create.</step>
  </task>
</tasks>

<verification>
- Nimra POST creates doc; duplicate code → 409.
- `po_creator` POST → 403.
- `npm run build` passes.
</verification>
