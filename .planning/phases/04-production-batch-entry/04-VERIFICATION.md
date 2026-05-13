# Phase 04 Verification — Production batch entry

**Status:** passed  
**Date:** 2026-05-13

## Must-haves

| Item | Result |
|------|--------|
| Nimra seeded (`nimra`, `batch_editor`, `Nimra-Batch-01`) | ✓ `scripts/seed-users.ts` |
| Auth accepts `batch_editor`; session includes `role` | ✓ `lib/auth.ts` callbacks |
| Post-login redirect by role | ✓ `app/page.tsx`, login → `/` |
| `GET /api/orders` for batch list | ✓ `batch_editor` only |
| `PATCH /api/orders/[id]/batches` | ✓ updates `sheetLines[].batchNo` |
| Production list + batch entry UI | ✓ `/production/batches`, `/production/orders/[id]` |
| PO creators blocked from batch PATCH | ✓ 403 |
| Nimra blocked from `/new-order` | ✓ layout redirect |
| Loading sheet reads saved batches | ✓ existing `sheetLines.batchNo` on print view |

## Build

`npm run build` — success.

## Gaps

None.
