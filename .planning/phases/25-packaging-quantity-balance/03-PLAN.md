---
wave: 3
depends_on: ["25-packaging-quantity-balance/02-PLAN.md"]
gap_closure: false
files_modified:
  - "lib/packagingDeduction.ts"
  - "app/api/orders/[id]/gate-delivery/route.ts"
  - "components/GateOrdersTable.tsx"
  - "app/(app)/dispatch/inventory/page.tsx"
  - "README.md"
  - ".planning/STATE.md"
autonomous: true
---

<phase_goal>
When **Zaman** marks an order **Delivered** (100% of that PO — single gate status per order), packaging for the shipment (**bottles, stickers, cartons/boxes** per order sheet) increases **UIP** so **balance** reflects remaining stock. Idempotent with existing `packagingDeductedAt`.
</phase_goal>

<must_haves>
- [ ] Keep idempotent delivery deduct (`packagingDeductedAt`); refine movement `reason` to `delivered` (migrate from `used` if needed).
- [ ] Deduction preview still blocks deliver when mappings missing or **balance** would go negative.
- [ ] Document in UI/README: filling counts **empty bottles/caps** into UIP; delivery counts **order BOM** (stickers, cartons, bottles per loading sheet) — ops should align counts; movement log is source of truth.
- [ ] Optional: gate success response includes `packagingDeductionSummary` (already on order) surfaced in Zaman UI as “Stock updated”.
- [ ] Admin/Haider inventory page link or note to view recent movements (list last N movements API optional stretch — if time, `GET /api/packaging-movements?limit=50` read-only).
</must_haves>

<tasks>
  <task id="1" name="delivery-deduct-refine">
    <step>Ensure `gate-delivery` PATCH uses `packagingBalance` before/after; sync `onHand` with balance after `$inc` uip.</step>
    <step>Improve error messages for insufficient balance referencing Purchased − Rejected − UIP.</step>
  </task>

  <task id="2" name="docs-and-visibility">
    <step>Update README workflow for Haider / Rashid / Zaman packaging balance chain.</step>
    <step>Update inventory page footer with ledger explanation and double-count guidance.</step>
    <step>Gate orders table: show brief confirmation when deduction applied.</step>
  </task>
</tasks>

<verification>
- `npm run build` passes.
- Delivered order increments UIP; balance decreases; cannot deliver twice.
- Haider sees lower balance after Rashid fill + Zaman deliver in test sequence.
</verification>
