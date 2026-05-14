---
wave: 1
depends_on: ["11-lock-production-batches/02-PLAN.md"]
gap_closure: false
files_modified:
  - "lib/roles.ts"
  - "lib/auth.ts"
  - "lib/models/Order.ts"
  - "lib/models/ProductPacking.ts"
  - "data/product-packings.json"
  - "scripts/seed-users.ts"
  - "scripts/seed-product-packings.ts"
  - "app/api/orders/route.ts"
  - "app/(app)/new-order/page.tsx"
  - "app/(app)/admin/layout.tsx"
autonomous: true
---

<phase_goal>
**Admin** role for **Waleed Intisar** with login, plus **Order city/deadline** and **catalog summary labels** so the pending-orders report can match the management PDF.
</phase_goal>

<must_haves>
- [ ] Role **`admin`**; `homePathForRole` → `/admin`; session/JWT carries role.
- [ ] Seed admin user **Waleed Intisar** (`waleed` / `Waleed-Admin-01`) via `seed-users.ts`.
- [ ] `Order.city`, `Order.deadlineDate` (optional strings/Date); POST `/api/orders` + new-order form fields.
- [ ] `ProductPacking.summaryLabel` seeded for grid column headers.
- [ ] `app/(app)/admin/layout.tsx` — admin only; others redirected.
</must_haves>

<tasks>
  <task id="1" name="admin-role">
    <step>Extend `AppRole` + `isAppRole` + `homePathForRole`.</step>
    <step>Ensure NextAuth callbacks pass `admin` role to session.</step>
    <step>Seed `waleed` (Waleed Intisar) with role `admin`.</step>
  </task>

  <task id="2" name="order-fields">
    <step>Add `city`, `deadlineDate` to Order schema.</step>
    <step>POST orders + new-order UI: city text, deadline date input.</step>
  </task>

  <task id="3" name="summary-labels">
    <step>Add `summaryLabel` to ProductPacking schema + seed JSON (short PDF-style headers).</step>
  </task>
</tasks>

<verification>
- Waleed can log in; lands on `/admin` (placeholder OK until plan 02).
- New PO saves city + deadline.
- `npm run build` passes.
</verification>
