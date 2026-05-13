---
wave: 1
depends_on: ["08-production-batch-registry/02-PLAN.md"]
gap_closure: false
files_modified:
  - "lib/models/DispatchTrip.ts"
  - "lib/models/Order.ts"
  - "app/api/dispatch-trips/route.ts"
  - "app/api/dispatch-trips/[id]/route.ts"
  - "app/api/dispatch-trips/[id]/orders/route.ts"
  - "lib/roles.ts"
autonomous: true
---

<phase_goal>
**Rashid** can group **multiple POs on one vehicle** (one truck, one driver, shared capacity). A **Dispatch trip** holds vehicle/driver/DC/helper/footer once and links many orders.
</phase_goal>

<stakeholder_need>
Each vehicle has its own capacity. Rashid often loads **more than one PO** on the same truck. Today dispatch fields are per-order only; he must re-enter the same vehicle details for every PO.
</stakeholder_need>

<data_model>
New collection **`DispatchTrip`**:

| Field | Type | Notes |
|-------|------|-------|
| `vehicleNo` | string | |
| `driverName` | string | |
| `dcNo` | string | |
| `helperName` | string | |
| `productionIncharge` | string | footer |
| `securityName` | string | footer |
| `driverSignature` | string | footer |
| `orderIds` | ObjectId[] | 1..N orders on this truck |
| `dispatchedAt` | Date | optional, set on save |
| `createdByUserId` / `createdByName` | | Rashid |
| `updatedAt` | | |

**Order** (extend):
- `dispatchTripId` — optional ObjectId ref; an order on at most **one** active trip.

**Sync rule (v1):** When trip is saved, copy trip dispatch fields → each linked `Order.dispatch` so existing per-PO loading sheet print still works without rewriting print layout.
</data_model>

<must_haves>
- [ ] `DispatchTrip` Mongoose model.
- [ ] `Order.dispatchTripId` optional; index for lookup.
- [ ] **`POST /api/dispatch-trips`** — `dispatch_editor`; create trip with `orderIds[]` + dispatch fields.
- [ ] **`GET /api/dispatch-trips`** — list trips (newest first) with PO numbers summary.
- [ ] **`GET /api/dispatch-trips/[id]`** — trip + populated order list (poNumber, customerName, id).
- [ ] **`PATCH /api/dispatch-trips/[id]`** — update fields; add/remove `orderIds`; sync `Order.dispatch` + `dispatchTripId` on all linked orders; clear `dispatchTripId` on removed orders.
- [ ] **`DELETE /api/dispatch-trips/[id]`** — unlink orders (clear `dispatchTripId`), delete trip; do not delete orders.
- [ ] Validation: order cannot belong to two trips; removed order keeps its last copied `dispatch` values (or clear — prefer keep for print history).
</must_haves>

<tasks>
  <task id="1" name="models">
    <step>Create `lib/models/DispatchTrip.ts`.</step>
    <step>Add `dispatchTripId` to `Order` schema.</step>
  </task>

  <task id="2" name="trip-api">
    <step>CRUD routes with `dispatch_editor` auth.</step>
    <step>Helper `syncTripDispatchToOrders(trip)` after every save.</step>
  </task>
</tasks>

<out_of_scope>
- Vehicle max-capacity liter validation (optional later).
- Combined single print PDF for all POs (Plan 02 may offer "print all" as separate tabs).
</out_of_scope>

<verification>
- API: create trip with 2 order IDs → both orders get same `dispatch.vehicleNo` and `dispatchTripId`.
- Remove one order from trip → its `dispatchTripId` cleared.
- `npm run build` passes.
</verification>
