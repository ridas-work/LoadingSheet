---
wave: 2
depends_on: ["16-packaging-inventory/01-PLAN.md"]
gap_closure: false
files_modified:
  - "app/(app)/dispatch/inventory/page.tsx"
  - "app/(app)/dispatch/inventory/[code]/page.tsx"
  - "components/PackagingInventoryGrid.tsx"
  - "app/(app)/layout.tsx"
  - "README.md"
autonomous: true
---

<phase_goal>
Rashid has a **dedicated packaging inventory route** under `/dispatch/inventory` to view and update on-hand counts for bottles, caps, stickers, etc. Waleed can view read-only.
</phase_goal>

<must_haves>
- [ ] `/dispatch/inventory` — table grouped by category (Bottle, Cap, Sticker, …) with on-hand qty and **Update count** action.
- [ ] Update flow: enter physical count + optional note; calls PATCH API; shows success.
- [ ] Nav: Rashid sees **Dispatch trips** + **Packaging inventory**; admin sees read-only link.
- [ ] Read-only mode for admin (no PATCH UI).
- [ ] README documents Rashid workflow and notes **future auto-deduct** as Phase 17.
- [ ] In-app hint that automatic deduction when filling bottles is coming later.
</must_haves>

<tasks>
  <task id="1" name="inventory-ui">
    <step>Create `PackagingInventoryGrid.tsx` client component: fetch items, group by category, highlight low stock optional (none v1).</step>
    <step>`dispatch/inventory/page.tsx` — server shell + grid; pass `readOnly` from role.</step>
    <step>`dispatch/inventory/[code]/page.tsx` or inline modal — form to set new on-hand count.</step>
  </task>

  <task id="2" name="nav-and-docs">
    <step>Update `app/(app)/layout.tsx`: Rashid + admin inventory nav links.</step>
    <step>README: Rashid packaging inventory section; link to future deduction phase.</step>
  </task>
</tasks>

<verification>
- Login as Rashid → `/dispatch/inventory` loads seeded items; update cap count persists after refresh.
- Login as Waleed → can view, cannot edit.
- PO creator / Nimra redirected away from route.
</verification>
