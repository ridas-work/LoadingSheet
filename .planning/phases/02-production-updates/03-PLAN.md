---
wave: 1
depends_on: []
files_modified:
  - "lib/models/ProductPacking.ts"
  - "app/api/products/route.ts"
  - "scripts/seed-product-packings.ts"
  - "app/(app)/new-order/page.tsx"
  - ".planning/REQUIREMENTS.md"
autonomous: true
---

<phase_goal>
Each **SKU / packing** has a **default bottles-per-carton** (e.g. Rhino 750 ML → 10). The New Order form **auto-fills** that value when the user picks a product, with an always-available **Edit / override** so **samples** can use e.g. **1 carton × 1 bottle** without changing the master default. Master list is loaded from MongoDB (seeded from the customer’s product table you will provide).
</phase_goal>

<why_this_is_a_good_idea>
- Matches how you already think: “this packing ships 10 per box.”
- Reduces typos and keeps loading sheets consistent.
- **Edit override** covers exceptions (samples, promos) without polluting the catalog with one-off products.
- Rule B stays clean: **one sheet row = one carton**; a **single-bottle sample** = **1 carton** with **bottles per carton = 1** (unless you later want “fractional carton” semantics — avoid unless needed).
</why_this_is_a_good_idea>

<must_haves>
- [ ] `ProductPacking` (or `Product`) collection: `name` (or code), `bottlesPerCarton` (integer ≥ 1), `active`, optional `aliases` for search.
- [ ] `GET /api/products` returns active packings for the order form (sorted by name).
- [ ] Seed script `npm run seed:products` reads from a checked-in JSON **or** env `SEED_PRODUCTS_JSON` until you paste the full list.
- [ ] New Order: per line — **product picker** (select) + **cartons** + **bottles/carton** prefilled from selection; **“Edit packing”** or inline unlock to change bottles/carton; optional **free-text product** if something is missing from catalog (flag or `isCustom` on line).
- [ ] Document in REQUIREMENTS: sample line = typically `cartons=1`, `bottlesPerCarton=1` after override.
</must_haves>

<tasks>
  <task id="T1" title="Model + API + seed">
    <steps>
      <step>Add Mongoose model and `GET /api/products`.</step>
      <step>Add `scripts/seed-product-packings.ts` + example `data/product-packings.example.json`.</step>
    </steps>
    <verification>
      <check>Seed creates records; GET returns JSON array.</check>
    </verification>
  </task>

  <task id="T2" title="New Order UX: pick product, default bottles/carton, editable">
    <steps>
      <step>Replace or supplement free-text product name with `<select>` from `/api/products`.</step>
      <step>On change: set `bottlesPerBox` from product default; keep user overrides if they toggled “custom packing qty”.</step>
      <step>Add explicit control: “Use default packing” vs “Custom bottles per carton” for samples.</step>
    </steps>
    <verification>
      <check>Selecting Rhino sets 10; enabling custom and entering 1 works; POST payload unchanged shape (`boxes`, `bottlesPerBox`).</check>
    </verification>
  </task>

  <task id="T3" title="Requirements + handoff note">
    <steps>
      <step>Update REQUIREMENTS Phase 02 section with catalog + override rules.</step>
      <step>Note: execution blocked on user supplying full product ↔ bottles-per-carton list (can seed iteratively).</step>
    </steps>
    <verification>
      <check>README or REQUIREMENTS lists expected JSON shape for the product list.</check>
    </verification>
  </task>
</tasks>

<definition_of_done>
Stakeholder can maintain a canonical packing list; order entry is faster; samples work via per-line override without new product master rows.
</definition_of_done>
