---
wave: 2
depends_on: ["21-gate-guard-zaman/01-PLAN.md"]
gap_closure: false
files_modified:
  - "app/(app)/gate/orders/page.tsx"
  - "app/(app)/gate/layout.tsx"
  - "app/(app)/layout.tsx"
  - "app/(app)/new-order/layout.tsx"
  - "app/(app)/production/layout.tsx"
  - "app/(app)/orders/layout.tsx"
  - "app/(app)/dispatch/layout.tsx"
autonomous: true
---

<phase_goal>
**Zaman** signs in and lands on a **gate orders** screen: pick an order, set **Out for delivery** / **Delivered** / **Pending redelivery** with clear labels; navigation and redirects keep other roles out of `/gate/*`.
</phase_goal>

<must_haves>
- [ ] **Route** `app/(app)/gate/layout.tsx`: require `gate_guard` (and optionally allow `admin` read-only same page **or** admin uses existing orders view — pick one: v1 **gate_guard only** on `/gate/orders`).
- [ ] **Page** `app/(app)/gate/orders/page.tsx`: client or server+client table from `GET /api/gate/orders`; filter chips: All active / Out / Pending redelivery / Delivered (last optional); row actions or dropdown to PATCH status (only valid next actions).
- [ ] **App shell** `app/(app)/layout.tsx`: if `gate_guard`, show link **Gate orders** → `/gate/orders`; hide PO / dispatch / production links inappropriate for this role (mirror minimal nav like `batch_editor`).
- [ ] **Redirect guards**: `gate_guard` opening `/new-order`, `/production/*`, `/dispatch/*` (except if shared read-only later) → redirect to `/gate/orders`; `po_creator` etc. must not open `/gate/*` → redirect to their home.
</must_haves>

<tasks>
  <task id="1" name="gate-layout-page">
    <step>Add `gate/layout.tsx` with role check + children.</step>
    <step>Add `gate/orders/page.tsx` — fetch list, status controls, loading/error states, success `router.refresh()`.</step>
  </task>
  <task id="2" name="cross-role-redirects">
    <step>Update `new-order/layout.tsx`, `production/layout.tsx`, `orders/layout.tsx`, and `app/(app)/dispatch/layout.tsx` to redirect `gate_guard` to `/gate/orders`.</step>
    <step>Add `app/(app)/gate` access guard: non–gate_guard non-admin → redirect home.</step>
    <step>Adjust root `app/(app)/layout.tsx` nav for `gate_guard`.</step>
  </task>
</tasks>

<verification>
- Login as Zaman → lands on `/gate/orders` (via `homePathForRole` after login — confirm login redirect target).
- Nimra/Rashid hitting `/gate/orders` → redirected away.
- Status buttons call PATCH and UI updates after refresh.
</verification>
