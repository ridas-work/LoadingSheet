---
wave: 1
depends_on: ["20-nimra-add-product/03-PLAN.md"]
gap_closure: false
files_modified:
  - "lib/models/Order.ts"
  - "lib/gateDelivery.ts"
  - "lib/roles.ts"
  - "lib/auth.ts"
  - "app/api/orders/[id]/gate-delivery/route.ts"
  - "app/api/gate/orders/route.ts"
  - "scripts/seed-users.ts"
autonomous: true
---

<phase_goal>
Introduce **`gate_guard`** role (Zaman), seed account, **order gate delivery status** on `Order`, and **APIs** to list gate-relevant orders and **PATCH** status with validated transitions — **gate_guard only** for writes.
</phase_goal>

<must_haves>
- [ ] **`AppRole`**: add `gate_guard`; `homePathForRole` → `/gate` (or `/gate/orders` if using nested route); `isAppRole` / authorize path accepts it.
- [ ] **Seed user**: `Zaman` / `zaman` / `Zaman-Guard-01` / `gate_guard` in `scripts/seed-users.ts`.
- [ ] **Order schema**: `gateDeliveryStatus` enum `none` | `out_for_delivery` | `delivered` | `pending_redelivery` (default `none`); timestamps `gateOutAt`, `gateDeliveredAt`, `gatePendingAt` (optional, set when entering corresponding state); `gateUpdatedByUserId`, `gateUpdatedByName`, `gateUpdatedAt`.
- [ ] **`lib/gateDelivery.ts`**: parse PATCH body; `assertTransition(from, to)`; map status → which timestamp to set.
- [ ] **`GET /api/gate/orders`**: auth required; **`gate_guard`** (and optionally **`admin`** read-only) — returns orders eligible for gate list (see RESEARCH: trip-linked and/or dispatch vehicle filled); include `poNumber`, `customerName`, `city`, `gateDeliveryStatus`, `dispatchTripId`, dispatch vehicle snippet.
- [ ] **`PATCH /api/orders/[id]/gate-delivery`**: **`gate_guard` only**; body `{ status: "out_for_delivery" | "delivered" | "pending_redelivery" }` (or include `none` only if needed for mistaken undo — v1: **no** revert from `delivered`); 400 on illegal transition; 404 if order not found; audit fields from session.
</must_haves>

<tasks>
  <task id="1" name="model-and-types">
    <step>Extend `Order` schema in `lib/models/Order.ts` with gate fields and enum.</step>
    <step>Add `lib/gateDelivery.ts` — status type, transition rules, `applyGateDeliveryPatch` helper.</step>
  </task>
  <task id="2" name="roles-seed">
    <step>Update `lib/roles.ts` for `gate_guard` and home path.</step>
    <step>Add Zaman to `scripts/seed-users.ts`.</step>
  </task>
  <task id="3" name="gate-apis">
    <step>Create `app/api/gate/orders/route.ts` — GET list query + role check.</step>
    <step>Create `app/api/orders/[id]/gate-delivery/route.ts` — PATCH with transition validation.</step>
  </task>
</tasks>

<verification>
- `npm run build` passes.
- `gate_guard` GET list returns 401 unauthenticated; `po_creator` GET → 403 (unless spec allows read — default **403** for non-gate roles).
- PATCH transition `none` → `out_for_delivery` → `delivered` succeeds; illegal jump → 400.
- Seed documents Zaman credentials in README (plan 03).
</verification>
