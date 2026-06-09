---
wave: 1
depends_on: []
files_modified:
  - ".planning/REQUIREMENTS.md"
  - "lib/models/Order.ts"
  - "app/api/orders/route.ts"
  - "app/(app)/new-order/page.tsx"
  - "app/(app)/orders/[id]/loading-sheet/page.tsx"
  - "components/LoadingSheetPrint.tsx"
autonomous: true
---

<phase_goal>
After a PO is saved, the operator gets a **print-ready loading sheet** matching your physical columns where sensible *today*: PO number, customer, box-numbered rows, product name, bottles per row (fixed bottles-per-box rule), empty placeholders for batch number and weight until production fills them. Document one explicit rule for **what “10 Rino bottles” means** (boxes vs total bottles) and encode it consistently.
</phase_goal>

<context_from_physical_sheet>
On **PAGE 1/3** of your sheet: each **Box No** row was effectively **one shipment carton/box**. **NO OF BOTTLES** was often constant per row (e.g. 10). Batch No + Weight were filled later per box/line at production.
</context_from_physical_sheet>

<business_rules_must_pick_one>

Choose exactly one interpretation used everywhere (labels + sheet expansion):

**Rule A — Bottle qty only (simple)**  
One PO line “Rhino, bottles = 100” means **total bottles**. Rows are generated using **`ceil(total_bottles / bottles_per_box)`** boxes (default `bottles_per_box = 10` unless overridden per product later).

**Rule B — Boxes explicitly (closest to paper)**  
Each PO line is “Rhino, **boxes** = 32” with optional bottles-per-box (default 10). One printed row per box.

**Rule C — No expansion yet**  
One PO line = one printed summary row (not equivalent to multi-page boxes).

> Recommendation for chemical carton packing: **Rule B** matches humans counting boxes on the truck; **Rule A** is OK if sales always speaks in total bottles.

</business_rules_must_pick_one>

<must_haves>
- [ ] Confirm with stakeholder **Rule A / B / C** above (document choice in REQUIREMENTS.md).
- [ ] Extend PO payload + Mongo schema if needed (`boxes`, `bottlesPerBox`, or stay `items[].bottles` with documented meaning).
- [ ] After successful order creation, offer **“View / Print loading sheet”** → `/orders/[id]/loading-sheet`.
- [ ] Printed columns align with paper template at minimum: **Box No**, **PRODUCT NAME**, **NO OF BOTTLES**, **Batch No** (blank / placeholder), **Weight** (blank), **PO NO**, **Customer Co**; header placeholders for **DC NO**, **Date**, **VEHICLE**, **DRIVER**, **HELPER** (blank until Phase 03).
- [ ] Sheet prints cleanly via browser Print (`print.css` or `@media print`).
</must_haves>

<tasks>
  <task id="T1" title="Lock semantic rule + update REQUIREMENTS / labels">
    <steps>
      <step>Record chosen rule (A/B/C) and defaults (e.g. bottles_per_box=10) in REQUIREMENTS.md Phase 02 section.</step>
      <step>Adjust New Order field labels to match (e.g. “Cartons (boxes)” vs “Total bottles”).</step>
    </steps>
    <verification>
      <check>Sales user understands how many sheet rows one submission produces.</check>
    </verification>
  </task>

  <task id="T2" title="Persist expandable lines OR derive at render time">
    <steps>
      <step>If Rule A or B: compute box rows from PO lines on save **or** when opening loading-sheet route (pick one; saving expanded rows helps auditing).</step>
      <step>Store optional fields `batchNo`, `weight` per row defaults empty.</step>
    </steps>
    <verification>
      <check>Mongo document reflects structure needed for production weights later.</check>
    </verification>
  </task>

  <task id="T3" title="Loading sheet page + print styles">
    <steps>
      <step>Add `/orders/[id]/loading-sheet` reading order by id.</step>
      <step>On POST `/api/orders` success, redirect or link to sheet.</step>
      <step>Implement print-friendly layout matching columns.</step>
    </steps>
    <verification>
      <check>Browser print preview shows table readable like paper sheet.</check>
    </verification>
  </task>
</tasks>

<definition_of_done>
Stakeholder-approved bottle/box rule is documented; each saved PO yields a printable multi-row loading sheet where batch/weight can be filled in Phase 02 production UI later.
</definition_of_done>
