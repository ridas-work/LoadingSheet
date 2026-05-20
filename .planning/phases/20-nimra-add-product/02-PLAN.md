---
wave: 2
depends_on: ["20-nimra-add-product/01-PLAN.md"]
gap_closure: false
files_modified:
  - "components/AddProductModal.tsx"
  - "app/(app)/production/batches/page.tsx"
autonomous: true
---

<phase_goal>
Nimra sees **Add product** on the production batches list and can submit the form to extend the catalog.
</phase_goal>

<must_haves>
- [ ] **Add product** button on `/production/batches` (visible only to `batch_editor`).
- [ ] Modal or slide-over: code, name, batch family (optional), bottles per carton, liters per bottle (optional hint).
- [ ] On success: close modal, `router.refresh()`, optional short success message.
</must_haves>

<tasks>
  <task id="1" name="add-product-ui">
    <step>`AddProductModal.tsx` client component calling POST `/api/product-packings`.</step>
    <step>Wire into `production/batches/page.tsx`.</step>
  </task>
</tasks>

<verification>
- Login as Nimra → Add product → save → new product appears in batch form product dropdown after refresh.
</verification>
