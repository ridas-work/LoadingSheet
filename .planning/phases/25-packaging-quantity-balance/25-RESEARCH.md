# Phase 25 Research — Packaging quantity balance

## Current state (already in codebase)

- `PackagingItem`: `purchasedQty`, `rejectedDamage`, `uip`, legacy `onHand`
- **Balance formula:** `purchased − rejected/damage − UIP` (`lib/packagingInventory.ts`)
- **Haider** edits all three columns manually on `/dispatch/inventory` today
- **Zaman → Delivered:** increments `uip` for full order BOM (bottles, caps, stickers, cartons) via `buildPackagingDeductionPreview` (`Phase 19`)
- **Rashid filling:** saves `filledBottlesToday` per packing line but **does not** touch packaging stock yet

## Gap vs user request

| Actor | Requested | Today |
|-------|-----------|-------|
| Haider | Enter purchased + rejected/damaged; see balance | Can edit UIP manually (should be system-only) |
| Rashid | Filled bottles → UIP | No stock movement |
| Zaman | Delivered order → subtract bottles, stickers, boxes (balance) | Adds full BOM to UIP on delivered (no fill linkage) |

## Recommended accounting (v1)

**UIP = Used in production / committed consumption** (reduces **Balance**).

1. **Haider** — only `purchasedQty` and `rejectedDamage`; **UIP read-only** on grid.
2. **Rashid** — on daily filling save, `$inc` UIP for **bottle + cap** SKUs mapped to each packing line’s `filledBottlesToday` **delta** vs previous saved entry (idempotent re-save).
3. **Zaman** — on first transition to **Delivered**, `$inc` UIP for order BOM with **split**:
   - Always: stickers, labels, cartons/boxes (and mixed-sample box families).
   - Bottles/caps: from order sheet lines (keep Phase 19 behavior) **or** document overlap with fill — v1 accepts both paths; admin can reconcile via movement log.

**Audit:** extend `PackagingStockMovement` with `reason`: `purchase_adjust` | `rejected` | `filling` | `delivered` | `manual` (Haider legacy).

## Key files

- `lib/packagingInventory.ts`, `lib/packagingDeduction.ts`
- `app/api/batch-filling/route.ts`
- `app/api/orders/[id]/gate-delivery/route.ts`
- `components/PackagingInventoryGrid.tsx`
- `lib/models/PackagingStockMovement.ts`

## Risks

- **Double-counting bottles** if same units are filled (UIP↑) and later deducted on delivery (UIP↑ again). Mitigation: movement notes + optional future link order↔batch; v1 document ops rule: filling counts empty bottles; delivery counts stickers/cartons primarily.

## RESEARCH COMPLETE
