---
wave: 1
depends_on: ["08-production-batch-registry/02-PLAN.md"]
gap_closure: false
files_modified:
  - "lib/models/ProductionBatch.ts"
  - "lib/models/ProductPacking.ts"
  - "data/product-packings.json"
  - "lib/batchVolume.ts"
  - "app/api/production-batches/route.ts"
  - "app/api/production-batches/[id]/route.ts"
  - "app/api/products/route.ts"
  - "scripts/seed-products.ts"
autonomous: true
---

<phase_goal>
Extend **ProductionBatch** with Nimra's QC/logistics fields (pH, solids, appearance, provider, drum, quantity) plus **product batch families** so one registered batch covers related packings (e.g. Power Wash + Power Wash pouch).
</phase_goal>

<stakeholder_need>
Nimra's manual sheet records technical and logistics data per batch. If a customer complains later, staff must see **what was entered when the batch was registered** — not free-form notes.

Power Wash and Power Wash (pouch) are the same product liquid; one batch applies to both packings on POs.
</stakeholder_need>

<data_model>
### ProductionBatch — new / changed fields

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `batchNo` | string | yes | unchanged, unique |
| `productName` | string | yes | stores **batch family** label (e.g. `Power Wash`) |
| `preparedAt` | Date | yes | Nimra's **date** |
| `ph` | string | yes | e.g. `7`, `6.5-7` |
| `solids` | string | yes | e.g. `29-30% (sinking 17)` |
| `appearance` | string | yes | e.g. `Clear liquid` |
| `provider` | string | yes | e.g. `Ramzan` |
| `drum` | string | yes | e.g. `6 * 150` |
| `quantity` | string | yes | Nimra's amount as typed (`450L`, `750kg`) |
| `totalLiters` | number | yes | dispatch pool size (unchanged behavior) |
| `notes` | string | optional | deprecate in UI; keep for legacy rows |

Existing documents without new fields: treat missing strings as `""` in API responses; edits must backfill required fields.

### ProductPacking — `batchFamily`

| Field | Type | Notes |
|-------|------|-------|
| `batchFamily` | string | Canonical name Nimra sees; defaults to `name` when seeding |

Seed: `power-wash` and `power-wash-pouch` → `batchFamily: "Power Wash"`.
</data_model>

<must_haves>
- [ ] `ProductionBatch` schema includes ph, solids, appearance, provider, drum, quantity (strings).
- [ ] POST/PATCH `/api/production-batches` validate and persist all fields; GET returns them.
- [ ] `ProductPacking.batchFamily` seeded; `productsMatch` matches by family (fallback to catalog name key).
- [ ] `/api/products` returns **deduped batch families** for Nimra dropdown (not every packing SKU).
- [ ] Rashid batch dropdown still works: Power Wash family batch selectable for Power Wash (pouch) PO lines.
</must_haves>

<tasks>
  <task id="1" name="schema-and-seed">
    <step>Add fields to `ProductionBatch` schema.</step>
    <step>Add `batchFamily` to `ProductPacking` schema + `data/product-packings.json` (at minimum Power Wash pair).</step>
    <step>Update `seed-products.ts` to persist `batchFamily`.</step>
  </task>

  <task id="2" name="product-matching">
    <step>`catalogProductKey` / `productsMatch` in `lib/batchVolume.ts`: resolve family via catalog; two packings in same family match each other and match batch `productName` when family equals.</step>
    <step>Extend `CatalogProduct` type with optional `batchFamily`.</step>
  </task>

  <task id="3" name="api">
    <step>POST/PATCH production-batches: require new string fields; resolve `productName` to catalog family's `batchFamily`.</step>
    <step>GET list/detail include all QC fields.</step>
    <step>`/api/products`: return `{ name, batchFamily, bottlesPerCarton }[]` deduped by `batchFamily` for batch form; keep existing consumers working.</step>
  </task>
</tasks>

<verification>
- Create batch with family `Power Wash`; assign on loading sheet row for `Power Wash (pouch)` PO — succeeds.
- API returns stored ph/solids/etc. unchanged on read.
- `npm run build` passes.
</verification>
