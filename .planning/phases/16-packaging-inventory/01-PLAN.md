---
wave: 1
depends_on: ["15-mixed-sample-box/02-PLAN.md"]
gap_closure: false
files_modified:
  - "lib/models/PackagingItem.ts"
  - "lib/models/PackagingStockMovement.ts"
  - "data/packaging-items.json"
  - "scripts/seed-packaging-items.ts"
  - "app/api/packaging-items/route.ts"
  - "app/api/packaging-items/[code]/route.ts"
  - "package.json"
autonomous: true
---

<phase_goal>
Persist **packaging materials catalog** (bottles, caps, stickers, …) and **on-hand quantities** with an **audit movement log**, exposed via API for Rashid.
</phase_goal>

<must_haves>
- [ ] `PackagingItem` model: code, name, category, unit, onHand, active.
- [ ] `PackagingStockMovement` model: itemCode, quantityDelta, quantityAfter, reason, note, recordedBy.
- [ ] Seed file + `npm run seed:packaging` loads catalog (default onHand 0).
- [ ] `GET /api/packaging-items` — authenticated; dispatch_editor + admin.
- [ ] `PATCH /api/packaging-items/[code]` — dispatch_editor only; set absolute `onHand` (physical count) with movement row; reject negative onHand.
- [ ] Optional `GET` movements for one item (last N).
</must_haves>

<tasks>
  <task id="1" name="models-and-seed">
    <step>Create Mongoose schemas for PackagingItem and PackagingStockMovement.</step>
    <step>Add `data/packaging-items.json` with starter rows: bottle/cap/sticker examples per major product lines.</step>
    <step>Add `scripts/seed-packaging-items.ts` and `seed:packaging` npm script.</step>
  </task>

  <task id="2" name="packaging-api">
    <step>`GET /api/packaging-items` — sort by category, name; filter `?category=` optional.</step>
    <step>`PATCH /api/packaging-items/[code]` — body `{ onHand: number, note?: string }` computes delta, appends movement with reason `count`, updates item.</step>
    <step>Guard: PATCH requires `canEditDispatch`; GET allows admin read-only.</step>
  </task>
</tasks>

<verification>
- Seed runs without error.
- PATCH sets onHand=500 from 0 → movement shows +500, onHand 500.
- PATCH to negative value rejected.
- `npm run build` passes.
</verification>
