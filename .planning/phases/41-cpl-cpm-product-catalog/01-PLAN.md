---
wave: 1
depends_on: []
gap_closure: false
files_modified:
  - "data/product-packings.json"
  - "data/packaging-items.json"
  - "data/product-packaging-bom.json"
autonomous: true
---

<phase_goal>
Seed **four sellable packings** and their **packaging BOM** so PO, deduction, and inventory can resolve CPL/CPM SKUs. Use **shared physical components** per bottle size (55 ml vs 210 ml); labels stay per product line.
</phase_goal>

<must_haves>
- [ ] `data/product-packings.json` — four rows:

| code | name | summaryLabel | batchFamily | bottlesPerCarton | litersPerBottle |
|------|------|--------------|-------------|------------------|-----------------|
| `cpl-55ml` | CPL 55ml | CPL 55 | CPL | 72 | 0.055 |
| `cpm-55ml` | CPM 55ml | CPM 55 | CPM | 72 | 0.055 |
| `cpl-210ml` | CPL 210ml | CPL 210 | CPL | 12 | 0.21 |
| `cpm-210ml` | CPM 210ml | CPM 210 | CPM | 12 | 0.21 |

- [ ] `data/packaging-items.json` — **15 new SKUs** (append after existing Washout block; increment `sortOrder`):

**Shared 55 ml**
- `cpl-cpm-55ml-bottle` — CPL/CPM 55 ML BOTTLE — `category: bottle`, `linkedBatchFamily: CPL`, `deductAs: bottle`
- `cpl-cpm-55ml-cap` — CPL/CPM 55 ML CAP — `category: cap`, `deductAs: cap`
- `cpl-cpm-55ml-small-box` — CPL/CPM 55 ML SMALL BOX — `category: box`, `deductAs: box`
- `cpl-cpm-55ml-big-box` — CPL/CPM 55 ML BIG BOX — `category: box`, `deductAs: box`

**Shared 210 ml**
- `cpl-cpm-210ml-bottle` — CPL/CPM 210 ML BOTTLE
- `cpl-cpm-210ml-pump` — CPL/CPM 210 ML PUMP — `category: cap`, `deductAs: cap`
- `cpl-cpm-210ml-box` — CPL/CPM 210 ML BOX

**Labels (per product)**
- `cpl-55ml-label-front`, `cpl-55ml-label-back` — `linkedProductCode: cpl-55ml`, `deductAs: label`
- `cpm-55ml-label-front`, `cpm-55ml-label-back` — `linkedProductCode: cpm-55ml`
- `cpl-210ml-label-front`, `cpl-210ml-label-back` — `linkedProductCode: cpl-210ml`
- `cpm-210ml-label-front`, `cpm-210ml-label-back` — `linkedProductCode: cpm-210ml`

- [ ] `data/product-packaging-bom.json` — four `productCode` entries:

**`cpl-55ml` / `cpm-55ml`** (mirror structure; swap label codes):
```json
{ "packagingItemCode": "cpl-cpm-55ml-bottle", "qtyPerBottle": 1 },
{ "packagingItemCode": "cpl-cpm-55ml-cap", "qtyPerBottle": 1 },
{ "packagingItemCode": "<product>-label-front", "qtyPerBottle": 1 },
{ "packagingItemCode": "<product>-label-back", "qtyPerBottle": 1 },
{ "packagingItemCode": "cpl-cpm-55ml-small-box", "qtyPerCarton": 6 },
{ "packagingItemCode": "cpl-cpm-55ml-big-box", "qtyPerCarton": 1 }
```

**`cpl-210ml` / `cpm-210ml`**:
```json
{ "packagingItemCode": "cpl-cpm-210ml-bottle", "qtyPerBottle": 1 },
{ "packagingItemCode": "cpl-cpm-210ml-pump", "qtyPerBottle": 1 },
{ "packagingItemCode": "<product>-label-front", "qtyPerBottle": 1 },
{ "packagingItemCode": "<product>-label-back", "qtyPerBottle": 1 },
{ "packagingItemCode": "cpl-cpm-210ml-box", "qtyPerCarton": 1 }
```

No partition lines for 210 ml.
</must_haves>

<tasks>
  <task id="T1" title="Product packings JSON">
    <step>Add four rows to `data/product-packings.json` with correct `bottlesPerCarton` (72 for 55 ml, 12 for 210 ml) and `litersPerBottle`.</step>
    <step>Add sensible `aliases` if factory uses alternate names (e.g. "CPL 55 ml").</step>
  </task>
  <task id="T2" title="Packaging items catalog">
    <step>Append 15 SKUs to `data/packaging-items.json` per must_haves naming.</step>
    <step>Ensure every BOM `packagingItemCode` exists in catalog (grep cross-check).</step>
  </task>
  <task id="T3" title="BOM entries">
    <step>Add four BOM blocks to `data/product-packaging-bom.json`.</step>
    <step>Confirm `qtyPerCarton` on small box is **6** (not 72) — deduction uses carton count from loading sheet × BOM qty.</step>
  </task>
</tasks>

<verification>
- `rg 'cpl-55ml|cpm-55ml|cpl-210ml|cpm-210ml' data/` returns packings + BOM + items.
- Every BOM `packagingItemCode` resolves in `packaging-items.json`.
- `npm run build` passes (JSON import paths unchanged).
</verification>
