# Phase 14 — Verification

**Phase goal:** PO team sees every catalog product in one list on `/new-order` and only enters carton counts; only filled rows go to the order and loading sheet.

## Must-haves

| # | Item | Evidence | Status |
|---|------|----------|--------|
| 1 | Full catalog grid (one row per active `ProductPacking`) | `components/NewOrderProductGrid.tsx` iterates `catalog` from `/api/products`; `new-order/page.tsx` seeds `grid` from the same list. | ✅ |
| 2 | Empty/zero cartons = product **not** on order | `buildSubmitItems()` in `app/(app)/new-order/page.tsx` skips rows where `cartons` is not an integer ≥ 1. | ✅ |
| 3 | Highlight rows with cartons > 0; footer **“X products · Y cartons”** | Active rows get `bg-emerald-50/60` + `border-emerald-300`; footer renders `summary.productCount` and `summary.totalCartons`. | ✅ |
| 4 | Per-row sample override | Each catalog row has a **Sample / custom** checkbox that flips `useDefaultPacking`; toggling off unlocks bottles/carton. | ✅ |
| 5 | Optional Other row | `+ Add other product` appends an `OtherRow` (name + cartons + bottles/carton + Remove). | ✅ |
| 6 | Remove unused `NewOrderProductTable.tsx` | File deleted; no remaining references in code (only history docs). | ✅ |
| 7 | No API/schema changes; `po_creator` only | `app/api/orders/route.ts` POST and `Order` schema untouched; `new-order` layout still redirects non-creators. | ✅ |
| 8 | README updated | PO-team workflow line in `README.md` rewritten to describe the full-list quantity entry. | ✅ |

## Build / lint
- `npm run build` → ✅ passes (Next 16.2.6, 19 routes generated, TypeScript clean).
- `ReadLints` on touched files → ✅ no diagnostics.

## Result
**Status:** `passed` — all must-haves verified against the codebase.
