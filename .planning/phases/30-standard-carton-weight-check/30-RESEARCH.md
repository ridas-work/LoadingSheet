# Phase 30 Research: Standard carton weight check

## User requirement

Rashid **weighs each carton** on a scale and **enters the weight manually** on the loading sheet **before the vehicle leaves**. The value must match the **Standard Weight List** within **5–8%** tolerance (up or down). If outside tolerance → **error: check the box again** (missing/extra bottles).

## Standard weight list (from factory sheet)

Physical **kilograms per full carton** — keyed by product + bottles per carton:

| Particular | Bottles | Weight (kg) |
|------------|---------|-------------|
| Washout Lemon | 10 | 11.395 |
| Washout Floral | 10 | 11.395 |
| Washout Ocean | 10 | 11.395 |
| Rhino 750 ml | 10 | 9.17 |
| Rhino 500 ml | 30 | 17.4 |
| Power Wash 500 ml | 10 | 5.8 |
| Power Wash pouch | 20 | 21.99 |
| Brighten bottle | 10 | 11.7 |
| Brighten pouch | 20 | 21.42 |
| Fabrito bottle | 10 | 11.05 |
| Fabrito pouch | 20 | 21.43 |
| Degrease | 10 | 6.01 |
| Titan | 8 | 11.37 |
| Power Wash set (PW+Degrease bundle) | 5 | 6.795 |
| Rhino set (2×2) | 5 | 8.99 |
| Brighten set (Brighten+Fabrito bundle) | 5 | 11.22 |

Map to catalog via `ProductPacking.code` or `summaryLabel` + `bottlesPerCarton`.

## Critical distinction: liters vs kg

Today `sheetLines[].weight` stores **liquid liters** (batch volume), auto-filled when batches are assigned (Phase 05). Header is **Weight (L)**.

The standard list is **physical carton mass in kg** — different unit and meaning.

**Decision:** Add **`cartonWeightKg`** on each sheet line for Rashid’s scale reading. Keep **`weight`** as liters for Nimra batch pool math. UI shows both in dispatch edit mode; print can show kg column for dispatch sign-off.

## When to validate

| Moment | Action |
|--------|--------|
| Rashid **Edit dispatch** / save on loading sheet | Require kg entered for rows with a standard; validate ±tolerance |
| Optional gate eligibility | Extend `gateEligibleMongoFilter` so Zaman only sees orders where all standard rows passed weight check |

“Before leaving” = block save until weights OK; optionally block gate until complete.

## Tolerance

User said **5–8% up or down**. Implement **±8%** as hard fail threshold (`actual` within `[standard×0.92, standard×1.08]`). Optional UI hint if deviation >5% but ≤8% (“close — double-check”). Document constant in `lib/standardCartonWeight.ts`.

## Rows without a standard

- **Mixed sample / custom carton** lines: no standard row → **skip validation** (no block); show “—” in standard column.
- **Rhino 250ml**, **Hand Sanitizer**, custom-bottle lines: not on list → skip until added to JSON.

## Matching logic

Lookup key: `(productName or catalog code) + bottlesPerBox`.

Use `findPackingByName` + `bottlesPerCarton` from sheet line’s `bottlesPerBox` (must equal standard bottles count for match). Bundles: match bundle SKU (5 bottles) not components.

## Affected files

| Area | Files |
|------|-------|
| Data | `data/standard-carton-weights.json` |
| Logic | `lib/standardCartonWeight.ts` |
| Schema | `lib/models/Order.ts` — `cartonWeightKg` on `SheetLineSchema` |
| UI | `components/LoadingSheetBatchEditor.tsx` |
| API | `app/api/orders/[id]/batch-assignments/route.ts`, maybe `dispatch` route |
| Gate | `lib/gateDelivery.ts` (optional wave 2) |
| Types | `lib/preserveSheetBatches.ts` — preserve `cartonWeightKg` |

## Risks

- Rashid enters weight in wrong unit (treat as kg; label clearly).
- Sheet line `bottlesPerBox` ≠ catalog default (custom packing) → lookup may fail; match on actual row bottles + best product name match.
