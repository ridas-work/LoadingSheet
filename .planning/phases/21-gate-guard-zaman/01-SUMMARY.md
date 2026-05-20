# Plan 01 — Gate model + API — complete

## Delivered

- `lib/gateDelivery.ts` — statuses, transitions, PATCH parse, timestamp fields, eligible Mongo filter.
- `lib/models/Order.ts` — `gateDeliveryStatus`, `gateOutAt`, `gateDeliveredAt`, `gatePendingAt`, audit fields.
- `lib/roles.ts` — `gate_guard`, `homePathForRole` → `/gate/orders`, `canViewGateOrders`, `canEditGateDelivery`.
- `scripts/seed-users.ts` — Zaman / `zaman` / `Zaman-Guard-01`.
- `GET /api/gate/orders` — gate_guard + admin read; filter query `active|out|pending|delivered|all`.
- `PATCH /api/orders/[id]/gate-delivery` — gate_guard only; validated transitions.
