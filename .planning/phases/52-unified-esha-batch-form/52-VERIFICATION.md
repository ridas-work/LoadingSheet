# Phase 52 Verification

**Status:** passed (code verified; factory UAT human_needed)  
**Goal:** Unified Esha batch form — one product list, no batch-type toggle

| # | Check | Result |
|---|-------|--------|
| 1 | `/production/batches/new` — single Product dropdown (dispatch + custom) | **pass** — optgroups in `ProductionBatchForm` |
| 2 | No Standard / Custom box toggle on create | **pass** — toggle removed |
| 3 | Custom product saves without drum (optional) | **pass** — `parseQcBody` drum not required |
| 4 | Rhino batch saves with HCL when required | **pass** — `showHcl` + server validation |
| 5 | `batchKind` inferred correctly in DB | **pass** — `inferBatchKindForProduct` on POST/PATCH |
| 6 | Rashid assigns Rhino batch on standard PO line | **pass** — existing pool + `productsMatch` |
| 7 | Rashid assigns custom product when line name matches | **pass** — `productsMatch` normalized fallback |
| 8 | Sample production toggle still works | **pass** — unchanged purpose toggle |
| 9 | `npm run build` | **pass** |

## UAT script

1. Log in as **Esha** → New batch → **Regular production** → pick **Brighten** from unified list → fill QC → save.
2. New batch → pick **HAND SANITIZER** → leave drum empty → save → appears on batch list with product name.
3. **Rashid** → PO loading sheet → assign Esha’s Brighten batch to Brighten line.
4. PO with Other line “HAND SANITIZER” → assign matching batch.
5. New **Sample production** batch → confirm not on regular PO picker.
