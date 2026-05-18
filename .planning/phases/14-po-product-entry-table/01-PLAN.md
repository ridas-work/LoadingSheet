---
wave: 1
depends_on: ["13-admin-oversight/02-PLAN.md"]
gap_closure: false
files_modified:
  - "components/NewOrderProductGrid.tsx"
  - "app/(app)/new-order/page.tsx"
  - "README.md"
autonomous: true
---

<phase_goal>
On **`/new-order`**, PO team sees **every catalog product in one list** and only enters **carton counts** (and bottles/carton for samples). **Only lines with cartons ≥ 1** are saved — typical 3–4 product orders, no add/remove product flow.
</phase_goal>

<must_haves>
- [ ] **Full catalog grid**: one row per active `ProductPacking` (~17 rows) — product name fixed, **Cartons** input, default **bottles/carton** shown.
- [ ] Empty/zero cartons = product **not** on order; cartons ≥ 1 → included in `items[]` and loading sheet.
- [ ] Highlight rows with cartons > 0; footer **“X products · Y cartons”**.
- [ ] Per-row **sample** override: toggle custom bottles/carton (e.g. set to 1) when needed.
- [ ] Optional **Other** row: custom product name + cartons (same as today’s fallback).
- [ ] Remove or replace partial `NewOrderProductTable.tsx` with `NewOrderProductGrid.tsx`.
- [ ] No API/schema changes; `po_creator` only.
- [ ] README updated for PO team.
</must_haves>

<tasks>
  <task id="1" name="product-grid-component">
    <step>Create `NewOrderProductGrid.tsx`: load catalog order from `/api/products`; state `Record<code, { cartons, bottlesPerBox, useDefaultPacking }>`.</step>
    <step>Table: Product | Cartons | Bottles/carton | Sample toggle; scroll on mobile.</step>
    <step>Footer totals: count of lines with cartons ≥ 1, sum cartons.</step>
    <step>Delete unused `NewOrderProductTable.tsx` if not integrated.</step>
  </task>

  <task id="2" name="integrate-new-order">
    <step>Refactor `new-order/page.tsx`: header fields unchanged; replace card/add-product UI with grid.</step>
    <step>On submit: `items = catalog rows.filter(cartons >= 1).map(...)` plus optional Other row.</step>
    <step>Validate: at least one product with cartons ≥ 1.</step>
    <step>README: explain full-list quantity entry for Nouman, Javeria, Aslam, Ibtisam.</step>
  </task>
</tasks>

<verification>
- PO creator enters cartons on 3 products only → order has 3 `items[]`; loading sheet has correct row count.
- Products left at 0 do not appear on loading sheet.
- `npm run build` passes.
</verification>
