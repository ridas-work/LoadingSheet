---
wave: 2
depends_on: ["01-PLAN.md", "02-PLAN.md"]
gap_closure: false
files_modified:
  - "app/api/orders/[id]/gate-delivery/route.ts"
  - "app/api/gate/orders/route.ts"
  - "components/GateOrdersTable.tsx"
  - "app/(app)/gate/orders/page.tsx"
autonomous: true
---

<phase_goal>
Zaman **closes delivery** from the gate screen: choose full vs partial, enter per-product **delivered / damaged / returned** counts, submit once to mark **Delivered** and lock the order.
</phase_goal>

<must_haves>
- [ ] “Mark delivered” opens a **Close delivery** modal (not instant PATCH).
- [ ] Modal shows table: Product | Dispatched | Delivered | Damaged | Returned with validation inline.
- [ ] Toggle **Fully delivered** pre-fills delivered = dispatched, damaged/returned = 0.
- [ ] **Partially delivered** enables editing returned split; damaged + returned ≤ dispatched - delivered.
- [ ] Submit PATCH `/api/orders/[id]/gate-delivery` with `{ status: "delivered", closure: { outcome, lines } }`.
- [ ] API saves closure fields, runs stock (plan 02), sets `orderClosedAt`, returns closure summary in JSON.
- [ ] Gate list page copy updated: closing delivery records returns and restores good bottles to Rashid stock.
- [ ] `GET /api/gate/orders` includes `deliveryOutcome` and closure totals for delivered filter.
</must_haves>

<tasks>
  <task id="T1" title="Gate-delivery API">
    <step>In `gate-delivery/route.ts`, when `status === "delivered"`, require parsed closure payload.</step>
    <step>After existing deduct logic, call `applyDeliveryClosureStock` for partial good returns.</step>
    <step>Persist `deliveryOutcome`, `deliveryClosureLines`, `orderClosedAt`, `orderClosedBy*` on order.</step>
    <step>Response includes `deliveryClosure` summary for UI success message.</step>
  </task>

  <task id="T2" title="Fetch dispatched lines for modal">
    <step>Add `GET` handler on `gate-delivery/route.ts` (or extend gate orders API) to return `buildClosureLinesFromOrder` for a single order when status is `out_for_delivery`.</step>
    <step>Include product names and dispatched bottle counts only (no stock secrets).</step>
  </task>

  <task id="T3" title="Close delivery modal UI">
    <step>Create `components/GateCloseDeliveryModal.tsx` (or inline in `GateOrdersTable`) with full/partial radio.</step>
    <step>Render editable table; auto-calc helper: when user changes delivered, cap damaged+returned to remainder.</step>
    <step>Replace direct `setStatus(id, "delivered")` with open modal → submit closure.</step>
    <step>Show success: “Closed — X delivered, Y returned to stock, Z damaged.”</step>
  </task>

  <task id="T4" title="Gate page copy">
    <step>Update `app/(app)/gate/orders/page.tsx` intro text to describe close-delivery workflow and partial returns.</step>
  </task>
</tasks>

<verification>
- Zaman can close full delivery in two clicks (open modal → confirm full → submit).
- Partial: enter returned/damaged per product; good returned visible on Rashid ready stock after close.
- Closed order cannot be edited (existing lock).
- `npm run build` passes.
</verification>
