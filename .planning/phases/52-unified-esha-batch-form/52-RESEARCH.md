# Phase 52 Research — Unified Esha production batch form

## User request

Esha currently picks **Batch type**: *Standard products* vs *Custom box / drums* before choosing **Product**. This splits the product list and shows different required fields (HCL vs Drum, etc.). User wants:

1. **No separate custom-box batch type** in the UI — everything under **Regular production** (sample production toggle stays).
2. **One product dropdown** listing **all** dispatch families **and** custom/drum products (Hand Sanitizer, Sequester, GLIM, etc.).
3. **Combined field layout** — drum, customer, HCL, viscosity on one form; non-applicable fields **optional/hidden by product**, not by batch-type toggle.
4. Easier for **Esha** to log batches and **Rashid** to assign them on loading sheets.

## Current architecture

| Piece | Behavior |
|-------|----------|
| `ProductionBatchForm` | Toggle `batchKind` → switches `productOptions` and entire field blocks |
| `listStandardBatchFamilies()` | Unique `batchFamily` from `ProductPacking` minus custom-box names |
| `listCustomBoxBatchProductNames()` | `data/custom-carton-products.json` + `CustomCartonProduct` DB |
| `batchKind` on `ProductionBatch` | `standard` \| `custom_box` — stored, shown on batch list |
| `resolveBatchProduct(name, batchKind)` | Different validation lists per kind |
| `parseQcBody` | `custom_box` → **drum required**; standard Rhino-family → **HCL required** |
| Rashid pool | `regularProductionBatchMongoFilter()` — **no filter on batchKind**; both kinds already in pool |
| Batch assignment | `productsMatch(batch.productName, line.productName, catalog)` — custom names only match if PO line uses same name / catalog key |

## Key insight

Removing the UI toggle does **not** require removing `batchKind` from the database. Infer `batchKind` server-side:

- Product in custom-box list → `custom_box`
- Else → `standard`

Rashid assignment already loads all regular batches; the pain is Esha picking the wrong type or not finding a product in the other list.

## Recommended design (v1)

### 1. Unified product catalog API

Extend `GET /api/products` (or new helper) with:

```ts
unifiedBatchProducts: {
  group: "dispatch" | "custom";
  name: string;
}[]
```

Sorted: dispatch families first, then custom/drum products (alphabetical within groups). Use `<optgroup>` in the form.

### 2. Single form layout

Remove **Batch type** toggle on create. Keep **Production purpose** (Regular / Sample).

**Always shown (required):** batch number, product, date, pH, solids, appearance, provider, quantity (liters), QC result.

**Conditional optional:**
| Field | Show when |
|-------|-----------|
| HCL | Product is Rhino-family liquid QC (current `isRhinoBatchFamily` logic) |
| Viscosity | `isViscosityApplicableBatchFamily(product)` |
| Drum | Product inferred as `custom_box` **or** always show as optional |
| Customer | Always optional |

Per user: **relax drum required** on server for `custom_box` (optional field). Esha can fill when relevant.

### 3. Server inference

`POST/PATCH /api/production-batches`:

- If `batchKind` omitted → `inferBatchKindFromProduct(resolvedProduct)`
- `resolveBatchProductUnified(name)` — try custom list, then standard family resolve
- Validation uses inferred kind for field clearing (hcl vs drum) but drum not required

### 4. Edit / list UX

- Edit page: show unified form (no kind toggle); `batchKind` read-only badge if needed for legacy
- Batch list: replace Standard/Custom column with product name only, or small tag “drum” when `drum` filled

### 5. Rashid / assignment (verify, minimal code)

- No pool filter change needed
- Document: custom-box batch `productName` must match how the product appears on PO / loading sheet (often “Other” row name)
- Optional enhancement: `productsMatch` fallback comparing normalized free-text for custom-box batch names (only if UAT shows mismatches)

### 6. Date field

Browser `<input type="date">` uses locale display; stored as ISO. Optional: helper text “Saved as DD/MM/YYYY on reports” (display format already unified in Phase 51 session).

## Out of scope

- Merging sample + regular pools (sample production stays separate)
- Auto-creating `ProductPacking` rows for every custom-box name
- Removing `batchKind` column from Mongo (keep for reporting)

## Risks

| Risk | Mitigation |
|------|------------|
| Duplicate names (e.g. “RHINO 5LTR” in custom list vs Rhino family) | Custom list entries that collide with dispatch families: show in both groups with label suffix, or dedupe with custom taking `custom_box` inference |
| Drum optional → incomplete drum batches | Acceptable per user; field still visible for custom products |
| Legacy batches edited with wrong kind | Infer kind on save from product |

## Files to touch

- `lib/nimraBatchProductLists.ts`
- `lib/productionBatchApi.ts`
- `app/api/production-batches/route.ts`, `[id]/route.ts`
- `app/api/products/route.ts`
- `components/ProductionBatchForm.tsx`
- `app/(app)/production/batches/page.tsx` (list column)
