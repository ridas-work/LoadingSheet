---
wave: 1
depends_on: ["07-session-security/01-PLAN.md"]
gap_closure: false
files_modified:
  - "lib/models/ProductionBatch.ts"
  - "lib/batchVolume.ts"
  - "app/api/production-batches/route.ts"
  - "app/api/production-batches/[id]/route.ts"
  - "app/(app)/production/batches/page.tsx"
  - "app/(app)/production/batches/new/page.tsx"
  - "components/ProductionBatchForm.tsx"
  - "lib/roles.ts"
  - "app/(app)/layout.tsx"
  - "README.md"
autonomous: true
---

<phase_goal>
**Nimra** registers each **prepared production batch** once — not per PO. When a batch is ready she enters **batch number**, **product** (Dishwash, Rhino, etc. from catalog), and **total liters**. Batches live in a shared pool for dispatch to use later.
</phase_goal>

<stakeholder_change>
| Before (Phases 04–05) | After (Phase 08) |
|------------------------|------------------|
| Nimra opens each PO loading sheet | Nimra opens **Production batches** only |
| Enters batch no per box row + liters per batch on that order | Enters **one record per prepared batch** (no PO) |
| Rashid only fills vehicle/driver/footer | Rashid assigns batches to POs (Plan 02) |
</stakeholder_change>

<data_model>
New MongoDB collection **`ProductionBatch`**:

| Field | Type | Notes |
|-------|------|-------|
| `batchNo` | string | Unique, trimmed (e.g. `B-2405-12`) |
| `productName` | string | From `ProductPacking` catalog |
| `totalLiters` | number | > 0 |
| `preparedAt` | Date | Default `now`; editable |
| `createdByUserId` | string | Nimra |
| `createdByName` | string | |
| `notes` | string | Optional |

**Do not** link to `Order` at create time.

**Remaining liters** (computed, not stored v1): `totalLiters − Σ(row liters allocated on all orders)` — allocation logic in Plan 02; this plan only creates the pool.
</data_model>

<must_haves>
- [ ] `ProductionBatch` Mongoose model with unique index on `batchNo`.
- [ ] **`GET /api/production-batches`** — any logged-in user; list sorted newest first.
- [ ] **`POST /api/production-batches`** — `batch_editor` only; body `{ batchNo, productName, totalLiters, preparedAt?, notes? }`; reject duplicate `batchNo`.
- [ ] **`PATCH /api/production-batches/[id]`** — `batch_editor` only; edit liters/product/notes (not batchNo v1).
- [ ] **`/production/batches`** — Nimra home: table of batches (batch no, product, liters, date); **Add batch** button.
- [ ] **`/production/batches/new`** — simple form with product dropdown from catalog API.
- [ ] Nimra **no longer** sees **Edit batches** on orders list or loading sheet (remove links in Plan 02; stub hide here if needed).
- [ ] PO creators cannot POST production batches (403).
</must_haves>

<tasks>
  <task id="1" name="model-and-api">
    <step>Create `lib/models/ProductionBatch.ts`.</step>
    <step>API routes with auth + role checks.</step>
    <step>Validate product exists in catalog (or allow free text with warning — prefer catalog match).</step>
  </task>

  <task id="2" name="nimra-ui">
    <step>Replace `/production/batches` order list with production batch registry list.</step>
    <step>Add create form page or modal.</step>
    <step>Nav: Nimra still lands on `/production/batches`.</step>
  </task>

  <task id="3" name="deprecate-nimra-po-batch-ui">
    <step>Remove **Edit batches** link from `orders/page.tsx` for `batch_editor`.</step>
    <step>Remove or hide batch edit toolbar on `LoadingSheetBatchEditor` for Nimra (`canEditBatches` always false).</step>
    <step>Keep `PATCH /api/orders/[id]/batches` disabled for batch_editor (403) or remove calls — Rashid uses new API in Plan 02.</step>
  </task>

  <task id="4" name="docs">
    <step>README workflow: Nimra registers batches → Rashid assigns to POs.</step>
  </task>
</tasks>

<out_of_scope>
- Rashid assigning batches to POs (Plan 02).
- Deleting batches with allocations.
- Barcode / label printing.
</out_of_scope>

<verification>
- Nimra: add batch `B1`, Rhino 750ml, 1000 L → appears in list.
- Nouman: can view list, cannot create.
- `npm run build` passes.
</verification>
