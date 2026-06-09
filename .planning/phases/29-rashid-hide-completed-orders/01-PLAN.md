---
wave: 1
depends_on: ["21-gate-guard-zaman/01-PLAN.md", "09-multi-po-vehicle-dispatch/02-PLAN.md"]
gap_closure: false
files_modified:
  - "lib/gateDelivery.ts"
  - "app/(app)/orders/page.tsx"
  - "app/(app)/dispatch/trips/new/page.tsx"
  - "app/(app)/dispatch/trips/[id]/page.tsx"
  - "components/OrdersListWithTrips.tsx"
autonomous: true
---

<phase_goal>
Once Rashid has finished dispatch (order is **out for delivery** or **delivered** at gate), remove it from his **active** `/orders` list and trip PO pickers so he is not confused by stale **Assign batches** actions. **`pending_redelivery`** orders return to his queue.
</phase_goal>

<must_haves>
- [ ] **`rashidActiveOrdersMongoFilter()`** in `lib/gateDelivery.ts` (or sibling `lib/dispatchOrderVisibility.ts` imported from gate module): `{ gateDeliveryStatus: { $nin: ["out_for_delivery", "delivered"] } }` — includes `none`, `pending_redelivery`, missing field.
- [ ] **`/orders`** (`app/(app)/orders/page.tsx`): when `role === "dispatch_editor"`, apply filter to `Order.find()`. Admin and `po_creator` unchanged.
- [ ] **`/dispatch/trips/new`**: trip PO picker query uses same filter so delivered/out POs cannot be added to new trips.
- [ ] **`/dispatch/trips/[id]`**: `DispatchTripOrderPicker` source query uses same filter (linked POs already on **this** trip remain editable via `initialOrderIds` / trip `orderIds` — do not remove delivered POs from trip detail **linked** list; only filter the **add PO** picker pool).
- [ ] **`OrdersListWithTrips`**: defensive UI — hide **Assign batches** when `gateDeliveryStatus` is `out_for_delivery` or `delivered` (pass status on row type); show small status label instead if needed.
- [ ] **Trip detail linked rows**: hide **Assign batches** when order `gateDeliveryStatus` is `out_for_delivery` or `delivered`; show **Delivered** / **Out for delivery** badge; keep **View / print**.
- [ ] `npm run build` passes.
- [ ] README one line under Rashid flow: completed gate orders no longer appear on `/orders`.
</must_haves>

<tasks>
  <task id="1" name="shared-filter">
    <step>Add `rashidActiveOrdersMongoFilter()` next to `gateEligibleMongoFilter()` in `lib/gateDelivery.ts`.</step>
    <step>Export `isRashidActiveGateStatus(status)` helper for UI checks (inverse of hidden statuses).</step>
    <step>Add unit-style tests optional — skip unless project has pattern; manual UAT sufficient.</step>
  </task>

  <task id="2" name="server-queries">
    <step>`orders/page.tsx`: read `gateDeliveryStatus` in select; apply `rashidActiveOrdersMongoFilter()` only for `dispatch_editor`.</step>
    <step>`dispatch/trips/new/page.tsx`: apply filter on `Order.find()` for picker list.</step>
    <step>`dispatch/trips/[id]/page.tsx`: (a) linked orders query — include `gateDeliveryStatus`; (b) picker pool query — apply rashid filter.</step>
  </task>

  <task id="3" name="ui-guards">
    <step>Extend `OrdersListWithTrips` row type with optional `gateDeliveryStatus`; condition `showAssignBatches = isDispatchEditor && isRashidActiveGateStatus(status) && !batchesLocked`.</step>
    <step>Trip detail page: gate-aware badges and suppress Assign batches for out/delivered linked POs.</step>
    <step>Empty state copy on `/orders` for Rashid when all orders are gate-complete: e.g. "No active orders — check Dispatch trips for history."</step>
  </task>

  <task id="4" name="docs-verify">
    <step>Update README Rashid bullet.</step>
    <step>Manual UAT: delivered PO (CSD Fortress) absent from `/orders` as Rashid; still visible as admin; Zaman gate list unchanged.</step>
  </task>
</tasks>

<verification>
- Log in as **Rashid** → `/orders` does **not** list PO with `gateDeliveryStatus: delivered` or `out_for_delivery`.
- Same PO with `pending_redelivery` **does** appear (Assign batches if batches incomplete).
- **Admin** `/orders` still shows all POs.
- **New trip** picker does not offer delivered/out POs.
- Open existing trip with delivered PO → **View / print** only, no Assign batches.
- `npm run build` passes.
</verification>
