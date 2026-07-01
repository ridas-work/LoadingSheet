# Phase 41 Research — CPL & CPM product catalog

## RESEARCH COMPLETE

### Goal
Add **four finished products** with full factory integration: PO catalog, packaging inventory (Haider), delivery/filling auto-deduct, Waleed low-stock alerts, Rashid morning plan tasks, Nimra batch families.

### Products (authoritative)

| Display | `productCode` | Volume | `bottlesPerCarton` | `litersPerBottle` | `batchFamily` |
|---------|---------------|--------|--------------------|-------------------|---------------|
| CPL 55 ml | `cpl-55ml` | 55 ml | **72** | 0.055 | `CPL` |
| CPM 55 ml | `cpm-55ml` | 55 ml | **72** | 0.055 | `CPM` |
| CPL 210 ml | `cpl-210ml` | 210 ml | **12** | 0.21 | `CPL` |
| CPM 210 ml | `cpm-210ml` | 210 ml | **12** | 0.21 | `CPM` |

**55 ml carton structure:** 1 big outer box = 6 small inner boxes × 12 bottles = **72 bottles**.

**210 ml carton structure:** 1 plain box, **12 bottles**, **no partition**.

### Packaging BOM (per product)

#### 55 ml — CPL & CPM (same physical components except labels)

| Component | SKU | Qty basis |
|-----------|-----|-----------|
| Bottle | `cpl-cpm-55ml-bottle` | 1 / bottle |
| Cap | `cpl-cpm-55ml-cap` | 1 / bottle |
| Front label | `cpl-55ml-label-front` or `cpm-55ml-label-front` | 1 / bottle |
| Back label | `cpl-55ml-label-back` or `cpm-55ml-label-back` | 1 / bottle |
| Small inner box | `cpl-cpm-55ml-small-box` | **6 / carton** (72 bottles) |
| Big outer box | `cpl-cpm-55ml-big-box` | **1 / carton** |

#### 210 ml — CPL & CPM

| Component | SKU | Qty basis |
|-----------|-----|-----------|
| Bottle | `cpl-cpm-210ml-bottle` | 1 / bottle |
| Pump | `cpl-cpm-210ml-pump` | 1 / bottle |
| Front label | `cpl-210ml-label-front` or `cpm-210ml-label-front` | 1 / bottle |
| Back label | `cpl-210ml-label-back` or `cpm-210ml-label-back` | 1 / bottle |
| Carton box | `cpl-cpm-210ml-box` | **1 / carton** (12 bottles) |

**Shared pools:** CPL and CPM at the same size share bottle/cap/pump/box SKUs (Washout pattern). Labels are per product line.

### Files to touch (no new API routes expected)

| File | Change |
|------|--------|
| `data/product-packings.json` | 4 catalog rows |
| `data/product-packaging-bom.json` | 4 BOM entries |
| `data/packaging-items.json` | ~15 new SKUs (7 shared + 8 labels) |
| `data/packaging-reorder-thresholds.json` | `shared_pool` for shared SKUs; `item_threshold` per label; optional `product_any_component` per finished SKU |
| `data/rashid-plan-product-tasks.json` | 4 product task blocks |
| `data/standard-carton-weights.json` | 4 rows — **weights TBD** from factory (block Phase 30 validation until supplied) |
| `scripts/seed-product-packings.ts` | run after JSON edit |
| `scripts/seed-packaging-items.ts` | run after JSON edit |

### Auto-wired surfaces (verify after seed)

- `/new-order` — reads Mongo `ProductPacking` (seeded from JSON)
- `/dispatch/inventory` — Haider sees new packaging rows
- Gate **Delivered** — `lib/packagingDeduction.ts` uses BOM + `bottlesPerCarton`
- Rashid **filling** — UIP by `linkedProductCode` / batch family
- `/admin/packaging-alerts` — new threshold rules
- `/admin/rashid-daily-plan` — Add product picker includes new tasks
- Nimra `/production/batches` — batch family `CPL` / `CPM`

### Default reorder thresholds (adjustable by Waleed later)

| Rule | Threshold |
|------|-----------|
| Each shared 55 ml component | 1000 |
| Each shared 210 ml component | 500 |
| Each label SKU | 1000 |
| Each finished product (`product_any_component`) | 1000 |

### Open items for executor

1. **Standard carton weights** — ask Waleed for kg per 72-bottle and 12-bottle cartons before enabling Phase 30 checks; can seed with estimated values flagged in README.
2. **Glim** — unrelated; do not mix with this phase.
3. Confirm label artwork names match factory (front/back split).

### Test scenarios (UAT)

1. PO with **CPL 55 ml × 2 cartons** → loading sheet 2 rows × 72 bottles; deliver → deduct 144 bottles, 2 big boxes, 12 small boxes, 144 caps, 144 front + back CPL labels.
2. PO with **CPM 55 ml × 1 carton** → shares bottle/cap/box pool with CPL; only CPM labels differ.
3. **CPL 210 ml × 3 cartons** → 36 bottles, 3 pumps, 3 boxes, no partitions.
4. Haider inventory shows **one row** per shared SKU (not duplicated per scent/line).
5. Waleed alerts: one row per shared bottle/cap/box; separate rows per label SKU.
