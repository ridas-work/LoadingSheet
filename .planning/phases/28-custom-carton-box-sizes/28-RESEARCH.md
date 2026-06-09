# Phase 28 Research — Custom carton box sizes (5L / 1L / 500ml / 250ml / 100ml)

## User request

Factory packs **custom cartons** (hybrid PO / Add custom carton) using **generic outer boxes by container size**, not per-product-family cartons:

| Size | Use |
|------|-----|
| **5 litre jar** | Large jar custom packs |
| **1 litre** | 1 L bottle/jar custom packs |
| **500 ml** | 500 ml custom packs |
| **250 ml** | 250 ml custom packs |
| **100 ml** | 100 ml custom packs |

Applies to **all products** inside the custom carton — one outer box SKU per physical custom carton, independent of Rhino vs Washout vs Brighten.

Standard full-carton lines keep existing **product-linked** box items (`rhino-boxes-500ml`, etc.).

## Current behavior (gap)

- Custom / `mixed_sample` sheet lines deduct outer box via **`mixedBoxFamilies`** → `findFamilyBoxItem(linkedBatchFamily)` (e.g. family `"Rhino"`).
- Many families have **no** mixed/custom box mapping → gate **Packaging mapping missing** when Nimra-fill deduction runs.
- PO team **cannot** specify which outer box size they used when defining a custom carton.
- `customCartons[]` on Order: `{ boxCount, contents, label? }` only — no box packaging reference.
- Sheet lines: `lineKind: mixed_sample`, `mixedContents` — no `customBoxCode`.

## Recommended design (v1)

### 1. Packaging catalog — five global SKUs

Add to `data/packaging-items.json` (seed to DB):

| code | name | category | deductAs |
|------|------|----------|----------|
| `custom-box-5l-jar` | CUSTOM BOX 5 LITRE JAR | box | box |
| `custom-box-1l` | CUSTOM BOX 1 LITRE | box | box |
| `custom-box-500ml` | CUSTOM BOX 500 ML | box | box |
| `custom-box-250ml` | CUSTOM BOX 250 ML | box | box |
| `custom-box-100ml` | CUSTOM BOX 100 ML | box | box |

No `linkedProductCode` — these are **size-only** custom outer cartons.

Optional schema flag on `PackagingItem`: `customCartonBox: true` for UI filtering (or infer from code prefix `custom-box-`).

### 2. Order + sheet line metadata

Extend `CustomCartonDef` / `CustomCartonSchema`:

```ts
customBoxCode: string  // required when custom carton present; one of the five codes
```

When `mergeStandardAndCustomSheetLines` builds `mixed_sample` rows, stamp each line with:

```ts
customBoxCode: carton.customBoxCode
```

Store on `SheetLineSchema` as optional `customBoxCode` (mixed/custom rows only).

### 3. Packaging deduction

In `summarizePackagingConsumption` / `summarizePackagingConsumptionExcludingReady`:

- For `mixed_sample` lines **with** `customBoxCode`: deduct **1** of that packaging item per physical sheet line (when carton deduction applies — same rules as Phase 26+ ready-shelf skip: only when `deductCarton` / not all-ready).
- **Stop** using `mixedBoxFamilies` for those lines (avoid double box deduct).
- Legacy lines without `customBoxCode`: keep family fallback OR default `custom-box-1l` with admin warning in movements note (prefer migration script for open POs).

Lookup: direct by `packagingItems.find(code === customBoxCode)` — no family match needed.

### 4. UI — PO team selects box size

On **Add custom carton** card (`CustomCartonBuilder`):

- Required dropdown: **Outer box size** → 5L jar / 1L / 500ml / 250ml / 100ml.
- Help text: “Which empty custom carton are you packing into? Haider tracks these separately from standard product cartons.”

Admin order edit: same field on saved custom cartons.

### 5. Filling / ready shelf (unchanged scope)

- **Ready-shelf delivered** cartons: no outer box UIP (Phase 26+ behavior).
- **Nimra-filled** custom carton: deduct outer `custom-box-*` only when that line needs batch fill.
- Bottle/cap/sticker deduction still per **product** inside the carton (unchanged).

### 6. Migration

- Existing hybrid orders with custom cartons but no `customBoxCode`: gate deduction may still hit family mapping until edited — document **re-save custom carton with box size** or one-time admin script inferring from largest `litersPerBottle` in `mixedContents`.

## Key files

| Area | Path |
|------|------|
| Packaging seed | `data/packaging-items.json`, `scripts/seed-packaging-items.ts` |
| Order model | `lib/models/Order.ts`, `lib/hybridSheetLines.ts` |
| Payload | `lib/orderPayload.ts` |
| Deduction | `lib/packagingDeduction.ts` |
| Gate | `app/api/orders/[id]/gate-delivery/route.ts` |
| UI | `components/CustomCartonBuilder.tsx`, `app/(app)/new-order/page.tsx`, `components/AdminOrderEditForm.tsx` |
| Sheet build | `lib/mixedSampleBox.ts` |

## Risks

- **Wrong box size selected** — ops responsibility; optional v2 hint from max bottle size in contents.
- **Legacy POs** without `customBoxCode` — need admin edit or inference fallback.

## RESEARCH COMPLETE
