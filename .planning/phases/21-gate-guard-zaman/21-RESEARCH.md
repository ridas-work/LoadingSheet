# Phase 21 — Gate guard (Zaman) — research notes

## RESEARCH COMPLETE

### Goal (operations)

**Zaman** works at the **gate**. When a vehicle leaves with orders, he marks each order **out for delivery**. When the vehicle returns and the customer received the goods, he marks **delivered**. If goods **come back** on the vehicle (time, refusal, partial return, etc.), he marks **pending redelivery** so the order stays visible for a later run — without confusing “pending” with the boss’s **pending orders** admin list (different meaning: use label **Pending redelivery** in UI).

### Current codebase (relevant)

- **`Order`** (`lib/models/Order.ts`): PO, lines, `dispatch`, `dispatchTripId` — **no** per-order delivery / gate field today.
- **`DispatchTrip`**: `orderIds[]`, vehicle fields, `dispatchedAt` — no per-order gate lifecycle.
- **Roles** (`lib/roles.ts`): `po_creator`, `batch_editor`, `dispatch_editor`, `admin` — add **`gate_guard`** with home **`/gate`** (or `/gate/orders`).
- **Auth** (`lib/auth.ts`): `isAppRole` must include new role for login.
- **Layouts**: `new-order`, `production`, `orders` (if any) redirect non-PO roles — extend so **`gate_guard`** only reaches gate + read-only order view if needed.
- **Seed** (`scripts/seed-users.ts`): add `{ name: "Zaman", username: "zaman", password: "Zaman-Guard-01", role: "gate_guard" }`.
- **Proxy** (`proxy.ts`): auth-only; role gating in **route layouts** (existing pattern).

### Design decisions (v1)

1. **Store state on `Order`** (not only on trip): gate workflow is **per PO / order**, even if several share one trip.
2. **Enum** (suggested field name `gateDeliveryStatus`):
   - `none` — default for legacy rows; not yet marked out.
   - `out_for_delivery` — vehicle left gate with this order’s goods.
   - `delivered` — confirmed delivered to customer.
   - `pending_redelivery` — returned to factory / gate; must go out again later.
3. **Allowed transitions** (guard-only API):
   - `none` → `out_for_delivery`
   - `out_for_delivery` → `delivered` **or** `pending_redelivery`
   - `pending_redelivery` → `out_for_delivery` (second trip)
   - `delivered` → no further edits in v1 (admin override optional later).
4. **Audit**: `gateUpdatedAt`, `gateUpdatedByUserId`, `gateUpdatedByName`; optional `gateNote` (short string) for “why returned” — optional in plan 01 (can defer to 02 if scope tight).
5. **List query**: Show orders that **matter at the gate** — v1: orders with **`dispatchTripId` set** (assigned to a trip) **or** non-empty `dispatch.vehicleNo` (Rashid filled header), sorted by `updatedAt` desc, with filters by `gateDeliveryStatus`. Exclude pure drafts with no dispatch linkage if that reduces noise (planner can tune in execute).
6. **Naming**: UI strings — **Out for delivery**, **Delivered**, **Pending redelivery** (avoid “pending order” alone).

### Credentials (seed)

| Name  | Username | Initial password   | Role         |
|-------|----------|--------------------|--------------|
| Zaman | `zaman`  | `Zaman-Guard-01`   | `gate_guard` |

### Risks / follow-ups

- Trips vs orders: if an order is removed from a trip in future, gate history should remain on the order.
- Reporting: management may want a **delivered** report by date — `gateDeliveredAt` timestamp recommended in model.
