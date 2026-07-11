---
wave: 1
depends_on: []
gap_closure: false
files_modified:
  - "lib/models/Order.ts"
  - "lib/gateDeliveryClosure.ts"
  - "lib/gateDelivery.ts"
autonomous: true
---

<phase_goal>
Persist **delivery closure** on the order when Zaman closes a PO: full vs partial outcome, per-product bottle counts, and validation rules before any stock movement.
</phase_goal>

<must_haves>
- [ ] `Order` stores `deliveryOutcome` (`full` | `partial`), `orderClosedAt`, `orderClosedByName`, and `deliveryClosureLines[]`.
- [ ] Each closure line has `productCode`, `productName`, `dispatchedBottles`, `deliveredBottles`, `damagedBottles`, `returnedBottles`.
- [ ] `lib/gateDeliveryClosure.ts` builds default lines from `sheetLines` via `bottlesPerProductFromSheetLines`.
- [ ] Validation enforces `delivered + damaged + returned === dispatched` per line and all counts are non-negative integers.
- [ ] Full outcome auto-fills lines: delivered = dispatched, damaged = 0, returned = 0.
- [ ] `parseGateDeliveryPatchBody` extended (or sibling parser) to accept `{ status: "delivered", closure: { outcome, lines? } }`.
</must_haves>

<tasks>
  <task id="T1" title="Order schema — closure fields">
    <step>Add to `lib/models/Order.ts`: `deliveryOutcome` enum (`full`, `partial`), `orderClosedAt`, `orderClosedByUserId`, `orderClosedByName`.</step>
    <step>Add `deliveryClosureLines` sub-schema array with product + four bottle counts + `dispatchedBottles`.</step>
    <step>Default `deliveryOutcome` null until closed; legacy delivered orders without closure data treated as `full` in readers.</step>
  </task>

  <task id="T2" title="Closure validation lib">
    <step>Create `lib/gateDeliveryClosure.ts` with types `DeliveryOutcome`, `DeliveryClosureLine`, `DeliveryClosurePayload`.</step>
    <step>Export `buildClosureLinesFromOrder(sheetLines, catalog)` returning dispatched counts per product.</step>
    <step>Export `parseDeliveryClosureBody(raw, dispatchedLines)` — validates outcome and line math; returns errors map or ok payload.</step>
    <step>Export `normalizeClosureForDisplay(order)` for API responses and reports.</step>
  </task>

  <task id="T3" title="Gate delivery parser extension">
    <step>Update `parseGateDeliveryPatchBody` in `lib/gateDelivery.ts` to optionally parse nested `closure` when `status === "delivered"`.</step>
    <step>Require `closure` object when transitioning to `delivered` (breaking change for one-click deliver — UI updated in plan 03).</step>
    <step>Keep `out_for_delivery` and `pending_redelivery` patches unchanged (no closure).</step>
  </task>
</tasks>

<verification>
- Unit-style manual check: `parseDeliveryClosureBody` rejects lines where delivered + damaged + returned ≠ dispatched.
- Full outcome with no custom lines succeeds and expands to dispatched totals.
- `npm run build` passes.
</verification>
