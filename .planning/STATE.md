# Project State

Phase: **18 planned** — Admin order edit (boss only)
Status: Plans ready — execute when approved

## Context
- **Phase 17 ✓** — Rashid daily filling + waste at `/dispatch/filling`
- **Phase 18 (new)** — Only **Waleed (admin)** can edit orders after creation (customer/product/qty corrections)
- **Phase 19** — Packaging auto-deduct (deferred)

## Decisions (Phase 18 planning)
- `canEditOrders` → admin only; PO creators cannot edit after submit
- PATCH rebuilds `sheetLines`; preserve `batchNo` / `componentBatches` when row identity matches
- Reuse new-order grid patterns on `/orders/[id]/edit`

## Next
- `/gsd-execute-phase 18`
