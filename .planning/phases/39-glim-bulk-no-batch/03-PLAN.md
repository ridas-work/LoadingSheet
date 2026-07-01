---
wave: 3
depends_on: ["39-glim-bulk-no-batch/02-PLAN.md"]
gap_closure: false
files_modified:
  - "components/LoadingSheetBatchEditor.tsx"
  - "components/PrintSheetButton.tsx"
  - "lib/catalogFromDb.ts"
autonomous: true
---

<phase_goal>
**Rashid loading sheet UI**: Glim rows show **no batch dropdown**; display **"Bulk fill (no batch)"** on screen and print. Dispatch save works end-to-end for Glim-only and mixed POs.
</phase_goal>

<must_haves>
- [ ] `catalogFromDb` maps `requiresProductionBatch` onto catalog rows passed to loading sheet.
- [ ] `LoadingSheetBatchEditor`: for bulk-fill rows, hide batch `<select>`; show static label; do not require batch in client save payload.
- [ ] Print sheet: batch column shows `bulkFillBatchLabel()` for Glim (not blank confusion).
- [ ] Hint text when PO contains Glim: "Glim is bulk-filled — no production batch required."
- [ ] `npm run build` + PM2 restart on server.
</must_haves>

<tasks>
  <task id="T1" title="Catalog mapping">
    <step>Extend `packingCatalogFromDocs` / `PackingCatalogRow` type with optional `requiresProductionBatch`.</step>
  </task>
  <task id="T2" title="Batch editor UI">
    <step>In row render, if `isBulkFillProduct(row, catalog)` → no dropdown, show label.</step>
    <step>Ensure save builds `assignments` with empty `batchNo` for those rows.</step>
  </task>
  <task id="T3" title="Print + deploy">
    <step>Update print batch display helper to use `lineBatchDisplay` from bundleCatalog (already centralized in plan 02).</step>
    <step>Build and restart `loadingsheet`.</step>
  </task>
</tasks>

<verification>
- Create test PO with Glim cartons → open `?dispatch=1` → save without selecting batch → batches lock.
- Print shows "Bulk fill" for Glim batch column.
- Gate delivery still deducts glim packaging components.
</verification>
