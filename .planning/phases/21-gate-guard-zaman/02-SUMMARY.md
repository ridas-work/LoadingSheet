# Plan 02 — Gate UI + redirects — complete

## Delivered

- `app/(app)/gate/layout.tsx` — gate_guard only; others redirect home.
- `app/(app)/gate/orders/page.tsx` + `components/GateOrdersTable.tsx` — filters, status actions, PATCH.
- `app/(app)/layout.tsx` — **Gate orders** nav for Zaman.
- Redirects: `gate_guard` blocked from `new-order`, `production`, `orders`, `dispatch` → `/gate/orders`.
