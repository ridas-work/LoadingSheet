---
wave: 3
depends_on: ["19-haider-packaging-auto-deduct/02-PLAN.md"]
gap_closure: false
files_modified:
  - "app/api/orders/[id]/gate-delivery/route.ts"
  - "lib/gateDelivery.ts"
  - "lib/models/Order.ts"
  - "lib/models/PackagingStockMovement.ts"
  - "lib/packagingDeduction.ts"
  - "components/GateOrdersTable.tsx"
  - "app/(app)/gate/orders/page.tsx"
  - "README.md"
  - ".planning/STATE.md"
autonomous: true
---

<phase_goal>
Automatically deduct packaging inventory exactly once when Zaman marks an order **Delivered**, with audit history and clear failure messages if packaging stock/mappings are not ready.
</phase_goal>

<must_haves>
- [ ] Trigger deduction on gate status transition **`out_for_delivery` → `delivered`**.
- [ ] Deduction is **idempotent**: refreshing, retrying, or attempting to mark delivered again must not deduct packaging twice.
- [ ] Store audit markers on `Order`, e.g. `packagingDeductedAt`, `packagingDeductedByName`, and enough summary/error metadata to troubleshoot.
- [ ] Write `PackagingStockMovement` rows with reason `used` (or a more specific enum value if added) and note tying each movement to PO/order/delivery.
- [ ] If stock is insufficient or required mappings are missing, block Delivered transition with a clear message so Haider can fix stock/mappings first.
- [ ] Gate UI surfaces deduction errors returned by the API without losing Zaman’s current row state.
- [ ] Admin can inspect resulting movement history from packaging item detail page.
- [ ] Pending redelivery does **not** deduct stock. Deduction happens only when the customer receives the goods (`delivered`).
- [ ] Existing already-delivered orders from before Phase 19 are not back-deducted automatically unless a migration/backfill is explicitly run.
</must_haves>

<tasks>
  <task id="1" name="order-audit-fields">
    <step>Add optional packaging deduction audit fields to `Order` schema.</step>
    <step>Ensure old orders without these fields still load.</step>
  </task>

  <task id="2" name="delivery-transaction">
    <step>In `PATCH /api/orders/[id]/gate-delivery`, when target status is `delivered`, load the order with `sheetLines`, catalog, and packaging inventory.</step>
    <step>Call `buildPackagingDeductionPreview` / apply helper from plan 02.</step>
    <step>Use a Mongo transaction if available; otherwise use a carefully ordered idempotent update: set deduction marker only once and write movements only for that successful first marker.</step>
    <step>Update each `PackagingItem` balance fields according to the current model (likely increment `uip` or reduce derived balance through a dedicated movement path; document chosen accounting semantics).</step>
    <step>Complete the gate status update only after packaging deduction succeeds.</step>
  </task>

  <task id="3" name="stock-and-mapping-errors">
    <step>Validate every deduction line has a matching active packaging item.</step>
    <step>Validate `quantityAfter` will not go negative unless a project-wide negative-stock policy is intentionally chosen.</step>
    <step>Return actionable API errors such as `Packaging missing: RHINO STICKERS 250 ML` or `Insufficient RHINO BOXES 250 ML: need 2, have 1`.</step>
  </task>

  <task id="4" name="ui-docs">
    <step>Update gate page help text: Delivered deducts packaging stock automatically.</step>
    <step>Update README workflow: Haider maintains packaging; Zaman Delivered triggers deduction.</step>
    <step>Update STATE after successful execution.</step>
  </task>
</tasks>

<verification>
- `npm run build` passes.
- Marking an eligible order `Out for delivery` does not deduct packaging.
- Marking it `Delivered` deducts expected bottles/stickers/caps/cartons and creates movement rows.
- Retrying/reloading after delivery does not deduct again.
- If packaging stock is insufficient, Delivered is blocked and order remains out for delivery.
- Pending redelivery does not deduct packaging.
</verification>
