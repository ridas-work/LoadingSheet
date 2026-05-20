# Plan 03 — Admin edit, loading sheet, docs — complete

## Done

- **`components/AdminOrderEditForm.tsx`:** Custom carton builder after product grid; hydrate from **`initial.customCartons`**; PATCH sends `customCartons`; Save enabled when **`activeCount > 0` OR valid custom payload** (custom-only orders).
- **`app/(app)/orders/[id]/edit/page.tsx`:** Passes **`customCartons`** from lean order into admin initial.
- **`lib/adminOrderSummary.ts`** / **`app/api/admin/summary/route.ts`:** Hybrid orders count **`items`** + **`customCartons`** bottle×box totals (non–`mixed_sample` branch).
- **Loading sheet:** Hybrid rows use existing **`lineKind: "mixed_sample"`** sheet lines from merge — **`normalizeSheetLines`** unchanged; mixed row rendering unchanged.
- **`README.md`** / **`.planning/STATE.md`**, **ROADMAP**, **REQUIREMENTS** updated for Phase 22.

## Manual regression (recommended)

- Batch assignment per row on hybrid sheet; dispatch trip + gate list smoke test.
