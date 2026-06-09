---
wave: 3
depends_on: ["26-ready-bottle-stock-ledger/02-PLAN.md", "25-packaging-quantity-balance/03-PLAN.md"]
gap_closure: false
files_modified:
  - "lib/models/Order.ts"
  - "app/api/orders/[id]/gate-delivery/route.ts"
  - "lib/readyBottleDispatch.ts"
  - "components/LoadingSheetBatchEditor.tsx"
  - "components/GateOrdersTable.tsx"
  - "app/(app)/admin/page.tsx"
  - "README.md"
  - ".planning/STATE.md"
autonomous: true
---

<phase_goal>
When orders **leave production**, deduct bottles from the ready pool; restore on **pending redelivery**. Show **ready vs needed** on loading sheet and gate so Rashid knows when to fill more from batches.
</phase_goal>

<must_haves>
- [ ] Order fields: `readyBottleDeductedAt`, `readyBottleDeductionSummary: [{ productCode, productName, bottles }]`, `readyBottleRestoredAt` (for redelivery).
- [ ] On gate PATCH → `out_for_delivery`: if not yet deducted, compute bottles from `sheetLines`, decrement ledger (`dispatch_out`), idempotent; **block transition** if any product would go negative (message lists SKU + shortfall).
- [ ] On gate PATCH → `pending_redelivery` from `out_for_delivery`: restore prior deduction (`dispatch_return`) if deducted; idempotent.
- [ ] Loading sheet header/toolbar: read-only **Ready stock check** — per product on PO, on-hand vs bottles needed (green ok / red short).
- [ ] Gate orders table: small column or badge "Ready OK" / "Short N" before Zaman marks out.
- [ ] Admin: link or section to ready-bottle movements (read-only).
- [ ] README + STATE updated.
</must_haves>

<tasks>
  <task id="1" name="dispatch-deduct-engine">
    <step>`lib/readyBottleDispatch.ts`: `deductForOrderOut(order)`, `restoreForOrderReturn(order)` using `bottlesFromSheetLines`.</step>
    <step>Integrate in `gate-delivery` route inside existing transaction flow; run before status commit.</step>
    <step>Mirror packaging pattern: store summary on order for audit display.</step>
  </task>

  <task id="2" name="shortage-ux">
    <step>Loading sheet: fetch stock map server-side or client; compare to PO bottle needs; show compact table or chips under toolbar.</step>
    <step>Gate UI: show shortage warning on row when Zaman tries out_for_delivery (API error surfaced inline).</step>
    <step>Copy: "When ready stock runs out, fill more from batches on Daily filling."</step>
  </task>

  <task id="3" name="docs-state">
    <step>README workflow: opening stock → Rashid ready entries → dispatch deduct → fill from batches when short.</step>
    <step>`.planning/STATE.md` mark Phase 26 planned/complete after execution.</step>
  </task>
</tasks>

<verification>
- Opening 100, PO needs 40, gate out → on-hand 60; movement `dispatch_out` −40 linked to PO.
- Repeat out_for_delivery PATCH idempotent (no double deduct).
- pending_redelivery restores 40; on-hand 100 again.
- PO needing 150 with on-hand 100 blocks out_for_delivery with clear shortfall message.
- Loading sheet shows shortage before dispatch.
</verification>
