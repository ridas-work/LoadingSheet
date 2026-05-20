---
wave: 1
depends_on: ["20-nimra-add-product/03-PLAN.md"]
gap_closure: false
files_modified:
  - "lib/orderPayload.ts"
  - "lib/mixedSampleBox.ts"
  - "lib/buildSheetLines.ts"
  - "lib/models/Order.ts"
  - "app/api/orders/route.ts"
autonomous: true
---

<phase_goal>
Allow **one order** to carry **standard carton `items`** and **zero or more custom multi-product cartons**, producing a **single merged `sheetLines` array** with correct global **`boxNo`** and existing **`lineKind`** semantics (`standard` vs `mixed_sample`).
</phase_goal>

<must_haves>
- [ ] **Payload contract:** extend POST/parse body with `customCartons?: Array<{ boxCount: number; contents: { productName: string; bottles: number }[]; label?: string }>` (exact field names documented in code comments).
- [ ] **Builder:** `buildHybridSheetLines({ items, customCartons })` or equivalent — `buildSheetLines(items)` then for each custom carton call existing `buildMixedSampleSheetLines` per definition with **local** box numbers, then **renumber** `boxNo` sequentially across the full list.
- [ ] **`orderKind` strategy:** document chosen approach — e.g. persist `orderKind: "standard"` when any standard `items` exist; set `mixedSample: null`; store `customCartons` on `Order` **or** derive-only from items+payload (prefer **persist** `customCartons` for admin re-edit). If schema adds `customCartons`, add optional subdocument array to `Order` with defaults `[]`.
- [ ] **`parseOrderBody`:** remove mutual exclusivity where “mixed only” blocks standard items; support **standard + customCartons** in one path; keep legacy **`orderKind: mixed_sample`** path working unchanged for old POs.
- [ ] **Validation:** each custom carton `boxCount ≥ 1`, `contents.length ≥ 1`, bottles ≥ 1; product names non-empty; align with catalog rules used by current mixed sample.
- [ ] **API POST** `app/api/orders/route.ts` — accepts new shape; no breaking change for clients that omit `customCartons`.
</must_haves>

<tasks>
  <task id="1" name="schema-and-types">
    <step>Optional `Order.customCartons` (or embed in payload-only if team prefers regenerate-from-items — pick one in execute and document).</step>
    <step>Add pure function module for merge + renumber (unit-test friendly).</step>
  </task>
  <task id="2" name="parse-order-body">
    <step>Refactor `lib/orderPayload.ts` branches: shared header parse; `standard + customCartons` branch; preserve `mixed_sample`-only legacy.</step>
  </task>
  <task id="3" name="api-wire">
    <step>Wire `app/api/orders/route.ts` (and PATCH if same parser reused) to persist new fields.</step>
  </task>
</tasks>

<verification>
- `npm run build` passes.
- POST order with only standard items → same `sheetLines` count as today.
- POST with standard + one `customCarton` with `boxCount: 2` → standard rows + 2 mixed_sample rows; `boxNo` unique contiguous.
- Legacy `mixed_sample` POST still works.
</verification>
