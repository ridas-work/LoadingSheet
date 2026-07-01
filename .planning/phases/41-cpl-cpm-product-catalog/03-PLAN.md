---
wave: 3
depends_on:
  - "01-PLAN.md"
  - "02-PLAN.md"
gap_closure: false
files_modified:
  - ".planning/phases/41-cpl-cpm-product-catalog/41-VERIFICATION.md"
autonomous: true
---

<phase_goal>
**Seed MongoDB**, smoke-test end-to-end flows, **build + deploy**, and record UAT checklist for CPL/CPM products.
</phase_goal>

<must_haves>
- [ ] Run `npm run seed:products` — four `ProductPacking` docs in Mongo.
- [ ] Run `npm run seed:packaging` — 15 new `PackagingItem` docs (balance 0 until Haider enters purchased qty).
- [ ] `npm run build` succeeds.
- [ ] `pm2 restart loadingsheet` on production host.
- [ ] `41-VERIFICATION.md` created with pass/fail checklist (see tasks).
</must_haves>

<tasks>
  <task id="T1" title="Seed database">
    <step>From `public_html`: `npm run seed:products && npm run seed:packaging`.</step>
    <step>Confirm Mongo: `db.productpackings.find({ code: /^cpl-|cpm-/ })` returns 4 rows.</step>
    <step>Confirm Mongo: packaging items for `cpl-cpm-55ml-bottle`, etc.</step>
  </task>
  <task id="T2" title="Smoke tests">
    <step>**PO** — log in as PO user; `/new-order` shows CPL 55 ml, CPM 55 ml, CPL 210 ml, CPM 210 ml in catalog grid.</step>
    <step>**Haider** — `/dispatch/inventory` lists new packaging SKUs (one row per shared bottle/cap/box).</step>
    <step>**Deduction preview** — create test PO: CPL 55 ml × 1 carton (72 bottles); inspect gate-delivery deduction or `packagingDeduction` unit path: 72 bottles, 72 caps, 72 front + back labels, 6 small boxes, 1 big box.</step>
    <step>**CPM 55 ml** on same PO — deducts from **same** shared bottle/cap/box pool; only label SKUs differ.</step>
    <step>**CPL 210 ml** × 1 carton — 12 bottles, 12 pumps, 12 labels each side, 1 box, **no partition** deduction.</step>
    <step>**Waleed alerts** — `/admin/packaging-alerts` shows single row for shared 55 ml bottle (not 4 duplicates).</step>
    <step>**Rashid plan** — Waleed can Add product → CPL 55 ml with cap/bottle/label/small box/big box tasks.</step>
    <step>**Nimra** — can register batch with `batchFamily` CPL or CPM and assign to loading sheet lines.</step>
  </task>
  <task id="T3" title="Deploy + verification doc">
    <step>`npm run build && pm2 restart loadingsheet`.</step>
    <step>Write `41-VERIFICATION.md` summarizing each smoke test (pass/fail, notes).</step>
    <step>Update `.planning/STATE.md` — Phase 41 complete when all checks pass.</step>
  </task>
</tasks>

<verification>
- All smoke tests in `41-VERIFICATION.md` marked pass.
- No duplicate packaging alert rows for shared SKUs.
- Production site serves updated catalog without 500 errors on `/api/product-packings`.
</verification>
