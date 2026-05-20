---
wave: 3
depends_on: ["22-hybrid-order-custom-boxes/02-PLAN.md"]
gap_closure: false
files_modified:
  - "components/AdminOrderEditForm.tsx"
  - "app/(app)/orders/[id]/loading-sheet/page.tsx"
  - "README.md"
  - ".planning/STATE.md"
autonomous: true
---

<phase_goal>
**Admin edit**, **loading sheet display**, and **docs** stay consistent with hybrid orders; regression checklist for batch and dispatch.
</phase_goal>

<must_haves>
- [ ] **`AdminOrderEditForm`:** edit `items` + `customCartons` (or rebuild from merged preview); preserve `preserveSheetBatches` behavior when `sheetLines` patch from server — follow existing admin PATCH patterns.
- [ ] **Loading sheet:** mixed lines already show `mixedContents` / label — verify hybrid rows render like current mixed sample rows; standard rows unchanged.
- [ ] **README** workflow: one bullet — **Custom cartons** on same PO as standard lines via **Add custom carton** (link to phase).
- [ ] **`STATE.md`:** Phase 22 planned / pointer to execute.
- [ ] **Regression checklist (manual):** `LoadingSheetBatchEditor` assigns batches per row; combo bundle rows if any; dispatch trip includes hybrid order; gate list unaffected.
</must_haves>

<tasks>
  <task id="1" name="admin-and-docs">
    <step>Extend admin form + `parseOrderBody` / PATCH path for orders `[id]`.</step>
    <step>README + STATE updates.</step>
    <step>Quick pass on `adminOrderSummary` / lists if `orderKind` display needs tweak for hybrid.</step>
  </task>
</tasks>

<verification>
- Admin can fix hybrid order lines after submit.
- Print preview shows interleaved standard + custom carton rows with correct box numbers.
</verification>
