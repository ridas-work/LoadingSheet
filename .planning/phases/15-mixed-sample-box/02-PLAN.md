---
wave: 2
depends_on: ["15-mixed-sample-box/01-PLAN.md"]
gap_closure: false
files_modified:
  - "components/NewOrderProductGrid.tsx"
  - "app/(app)/new-order/page.tsx"
  - "components/LoadingSheetBatchEditor.tsx"
  - "lib/adminOrderSummary.ts"
  - "README.md"
autonomous: true
---

<phase_goal>
PO team can enter **mixed sample box** orders on `/new-order`; loading sheet and admin summary display them correctly.
</phase_goal>

<must_haves>
- [ ] `/new-order` toggle **Mixed sample box order** switches grid to **bottles per product** (not cartons) + **Number of mixed boxes** field.
- [ ] Submit sends `orderKind: "mixed_sample"` + `mixedSample` payload; standard mode unchanged.
- [ ] Loading sheet shows one row per physical mixed box; product cell lists contents; batch editor shows per-product batch dropdowns.
- [ ] Admin pending summary attributes bottle counts from mixed sample contents to product columns (× boxCount).
- [ ] README documents mixed sample workflow for PO team.
</must_haves>

<tasks>
  <task id="1" name="new-order-mixed-ui">
    <step>Add order-kind toggle on `new-order/page.tsx` (standard vs mixed sample).</step>
    <step>Extend `NewOrderProductGrid` (or sibling component) with `mode: "cartons" | "bottles"` — mixed mode: column header **Bottles**, hide Sample/custom cartons toggle; show **Mixed boxes** count input.</step>
    <step>Build submit payload: `contents` = catalog rows with bottles ≥ 1; validate at least one product and boxCount ≥ 1.</step>
  </task>

  <task id="2" name="loading-sheet-and-admin">
    <step>`LoadingSheetBatchEditor`: if `lineKind === "mixed_sample"`, render product breakdown + component batch UI (mirror bundle rows).</step>
    <step>`adminOrderSummary`: for `mixed_sample` orders, add bottles to column totals from `mixedSample.contents × boxCount`.</step>
    <step>Update README workflow step for PO team.</step>
  </task>
</tasks>

<verification>
- PO creates mixed sample: 5 + 2 bottles, 1 box → 1 loading-sheet row, both products visible.
- Waleed summary shows 5 and 2 in correct product columns (not 1+1 cartons).
- Standard PO flow still works with carton grid.
</verification>
