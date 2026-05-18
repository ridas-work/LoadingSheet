---
wave: 1
depends_on: ["13-admin-oversight/02-PLAN.md"]
gap_closure: false
files_modified:
  - "components/NewOrderProductTable.tsx"
  - "app/(app)/new-order/page.tsx"
  - "README.md"
autonomous: true
---

<phase_goal>
PO team (**Nouman, Javeria, Aslam, Ibtisam**) enter products on **`/new-order`** in a **single review table** — one row per product line with product name, cartons, and bottles/carton visible together before save.
</phase_goal>

<must_haves>
- [ ] Product lines render as an **HTML table** (not stacked cards): #, Product, Cartons, Bottles/carton, Remove.
- [ ] **+ Add product** adds a new table row; remove works when more than one row.
- [ ] Existing behaviour preserved: catalog pick, custom product, custom bottles/carton override, validation.
- [ ] **Total cartons** shown below table (sum of complete lines).
- [ ] Incomplete rows visually distinct; field errors shown per row.
- [ ] `po_creator` only; no API/schema changes.
- [ ] README note for PO team.
</must_haves>

<tasks>
  <task id="1" name="product-table-component">
    <step>Extract `NewOrderProductTable` from `new-order/page.tsx` — props: `items`, `catalog`, `catalogLoading`, `errors`, callbacks (`onItemsChange`, `addItem`, `removeItem`, catalog helpers).</step>
    <step>Table header + `<tbody>` one `<tr>` per item; responsive `overflow-x-auto` wrapper.</step>
    <step>Product column: select + conditional custom name input; optional compact custom-bpb checkbox.</step>
  </task>

  <task id="2" name="integrate-page">
    <step>Wire `NewOrderProductTable` into `new-order/page.tsx`; keep validate/submit logic on page.</step>
    <step>Footer: **Total cartons** = sum of `boxes` for lines that pass row completeness check.</step>
    <step>README: PO creators can review all lines in the product table before Create order.</step>
  </task>
</tasks>

<verification>
- Multi-line order displays as a scannable table.
- Save still works; loading sheet row count matches sum of cartons.
- `npm run build` passes.
</verification>
