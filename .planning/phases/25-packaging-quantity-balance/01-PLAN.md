---
wave: 1
depends_on: ["19-haider-packaging-auto-deduct/03-PLAN.md", "23-rashid-bottle-filling-readiness/02-PLAN.md"]
gap_closure: false
files_modified:
  - "lib/packagingInventory.ts"
  - "app/api/packaging-items/[code]/route.ts"
  - "components/PackagingInventoryGrid.tsx"
  - "app/(app)/dispatch/inventory/page.tsx"
  - "lib/models/PackagingStockMovement.ts"
autonomous: true
---

<phase_goal>
**Haider** maintains the packaging ledger: **purchased quantity** and **rejected/damaged** only; **UIP** and **balance** are system-calculated and read-only on his portal.
</phase_goal>

<must_haves>
- [ ] Haider can PATCH `purchasedQty` and `rejectedDamage` only; API rejects direct `uip` edits from `packaging_editor`.
- [ ] Admin may still view all columns read-only.
- [ ] Grid shows columns: **Purchased**, **Rejected/Damage**, **UIP** (read-only), **Balance** (computed, read-only).
- [ ] Help text: `Balance = Purchased − Rejected/Damage − UIP`.
- [ ] `PackagingStockMovement` records Haider adjustments with reason `purchase_adjust` or `rejected` when values change.
- [ ] `onHand` kept in sync with `packagingBalance()` on save for backward compatibility.
</must_haves>

<tasks>
  <task id="1" name="api-guard">
    <step>In `app/api/packaging-items/[code]/route.ts`, if role is `packaging_editor`, ignore/strip `uip` from PATCH body; only apply purchased/rejected.</step>
    <step>Write movement rows when purchased or rejected changes (delta, user, note).</step>
  </task>

  <task id="2" name="grid-readonly-uip">
    <step>Update `PackagingInventoryGrid`: Haider edits purchased + rejected only; UIP and balance display-only (no input).</step>
    <step>Update `/dispatch/inventory` page copy for check-and-balance workflow.</step>
  </task>
</tasks>

<verification>
- `npm run build` passes.
- Haider PATCH with `uip` in body does not change stored UIP.
- Balance updates when purchased or rejected changes.
</verification>
