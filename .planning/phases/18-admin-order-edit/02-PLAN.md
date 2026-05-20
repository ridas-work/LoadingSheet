---
wave: 2
depends_on: ["18-admin-order-edit/01-PLAN.md"]
gap_closure: false
files_modified:
  - "app/(app)/orders/[id]/edit/page.tsx"
  - "components/AdminOrderEditForm.tsx"
  - "components/OrdersListWithTrips.tsx"
  - "app/(app)/layout.tsx"
autonomous: true
---

<phase_goal>
Waleed can open **Edit order** from the orders list, change PO details and product quantities on a form like new-order, and save.
</phase_goal>

<must_haves>
- [ ] `/orders/[id]/edit` — admin only; redirect others to orders or home.
- [ ] Form prefills PO number, customer, city, deadline, standard grid or mixed-sample mode from existing order.
- [ ] Submit calls `PATCH /api/orders/[id]`; success → loading sheet or orders list.
- [ ] Warning banner if order has batch assignments and/or dispatch trip.
- [ ] Orders list shows **Edit order** link for admin only (next to View loading sheet).
</must_haves>

<tasks>
  <task id="1" name="edit-form">
    <step>`AdminOrderEditForm.tsx` — client form; reuse catalog fetch + grid/mixed UI patterns from new-order.</step>
    <step>Server page loads order, passes serialized initial state.</step>
  </task>

  <task id="2" name="orders-list-link">
    <step>Update `OrdersListWithTrips` — `canEditOrders` prop → Edit link to `/orders/[id]/edit`.</step>
    <step>Orders page passes `canEditOrders={isAdmin(role)}`.</step>
  </task>
</tasks>

<verification>
- Login as Waleed → Orders → Edit → change customer/qty → save → loading sheet reflects changes.
- Login as Nouman → no Edit link; direct URL to edit → forbidden/redirect.
</verification>
