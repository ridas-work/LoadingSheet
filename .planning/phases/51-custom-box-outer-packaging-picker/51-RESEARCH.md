# Phase 51 Research — Custom carton outer box picker

## User request

When **Nouman, Javeria, Aslam, or Ahtisham** (and Waleed on admin edit) build a **custom carton** on a PO, the system correctly deducts **inner BOM** items per product (e.g. 1× Rhino 750 ml bottle, lid, cap, sticker) — but **which outer shipping box** to deduct from Haider inventory is unclear.

**Desired behavior:** For every custom carton, the rep **must pick the outer box** they are packing into. On gate delivery, deduct **that selected box SKU** (one per physical custom carton row on the loading sheet).

## Current state (code audit 2026-07-10)

### Already implemented (Phase 28 backend)

| Area | Status |
|------|--------|
| Five packaging SKUs `custom-box-5l-jar` … `custom-box-100ml` | ✓ `lib/customCartonBoxes.ts`, seed data |
| `customBoxCode` on `Order.customCartons[]` + `sheetLines[]` | ✓ `Order.ts`, `hybridSheetLines.ts`, `mixedSampleBox.ts` |
| Gate deduction uses `customBoxCode` when set | ✓ `packagingDeduction.ts` → `findCustomCartonBoxItem` |
| BOM deducts bottles/caps/stickers per mixed line contents | ✓ `summarizeBomPackagingRequirements` |
| `suggestCustomBoxCodeFromContents()` helper | ✓ largest `litersPerBottle` in carton |
| `assertValidCustomBoxCode()` | ✓ |

### Gap (why UAT fails)

| Gap | Detail |
|-----|--------|
| **No UI picker** | `CustomCartonBuilder.tsx` has `customBoxCode` on draft type but **no Outer box size `<select>`** in the rendered form (Phase 28 Plan 02 not present in current tree). |
| **Server not required** | `parseCustomCartons()` only validates `customBoxCode` **if provided** — cartons can save with empty code. |
| **No client validation** | `/new-order` does not require outer box before submit. |
| **Silent missing deduct** | Mixed/custom sheet lines **without** `customBoxCode` deduct BOM only — **zero outer boxes** (no family fallback in current `summarizeBomPackagingRequirements`). |

### Who uses custom cartons

| User | Route | Custom cartons |
|------|-------|----------------|
| Nouman / Javeria / Aslam / Ahtisham | `/new-order` | ✓ `CustomCartonBuilder` |
| Waleed | `/orders/[id]/edit` via `AdminOrderEditForm` | ✓ |
| Field visit **samples** | Approve → `field_sample` order | ✗ standard lines only (1 product = 1 carton); **out of scope** unless reps later request sample custom packs |

### Deduction model (unchanged)

For each **custom / mixed_sample** loading-sheet row with `customBoxCode`:

1. **BOM** — per product inside the carton (bottles, caps, stickers, …) from `product-packaging-bom.json`
2. **Outer box** — exactly **1×** selected `custom-box-*` packaging item per physical row

Standard full-carton product lines keep product-linked cartons (`rhino-boxes-750ml`, etc.) — unchanged.

## Recommended design (v1)

### 1. Required outer box per custom carton (UI + API)

- `CustomCartonBuilder`: required **Outer box size** dropdown using `CUSTOM_CARTON_BOX_OPTIONS` (5 sizes).
- Help text: *“Which empty custom carton are you packing into? Haider deducts this box on delivery — separate from bottle/cap/sticker BOM.”*
- On add carton: auto-suggest from `suggestCustomBoxCodeFromContents()` when products are entered; user can override.
- `parseCustomCartons`: **require** `customBoxCode` for every custom carton (not optional).
- `/new-order` + `AdminOrderEditForm`: client validation mirrors server.

### 2. Legacy orders

- Admin edit: banner if any saved carton missing `customBoxCode` — *“Select outer box size before next delivery.”*
- `draftsFromSavedCartons`: restore code; suggest if missing.

### 3. Display

- `OrderPoDetailPanel` / approvals / admin lists: show outer box label via `customCartonBoxLabel()` (already in `orderPoDetail.ts`).

### 4. Ops

- Confirm five `custom-box-*` rows exist in Haider inventory (`seed:packaging` or manual).

### Out of scope (v1)

- Picking arbitrary Haider box SKUs beyond the five `custom-box-*` sizes (can be Phase 51b if factory adds more).
- Field visit sample custom cartons.
- Auto-deduct outer box at fill time (still on gate delivery close).

## Key files

- `components/CustomCartonBuilder.tsx` — UI picker
- `app/(app)/new-order/page.tsx` — PO creator validation
- `components/AdminOrderEditForm.tsx` — boss edit
- `lib/orderPayload.ts` — require `customBoxCode`
- `lib/packagingDeduction.ts` — already correct when code present
- `lib/customCartonBoxes.ts` — options + suggest helper

## Risks

| Risk | Mitigation |
|------|------------|
| Open POs without box code block edit/save | Admin edit with suggest + banner; gate already blocks missing mapping |
| Reps confuse bottle size vs outer box | Clear labels: row **container size** vs carton **outer box size** |
| Wrong suggest | Always user-overridable; suggest is default only |

## References

- `.planning/phases/28-custom-carton-box-sizes/28-RESEARCH.md` (original design)
- `.planning/phases/28-custom-carton-box-sizes/02-PLAN.md` (UI plan — needs re-execution)
