# Phase 06 Verification — Dispatch assignment (Rashid)

**Status:** passed  
**Date:** 2026-05-13

## Must-haves

| # | Requirement | Status | Evidence |
|---|-------------|--------|----------|
| 1 | Rashid seeded (`rashid`, `dispatch_editor`, `Rashid-Dispatch-01`) | ✓ | `scripts/seed-users.ts` |
| 2 | Auth accepts `dispatch_editor`; redirect to `/orders` | ✓ | `lib/roles.ts`, `homePathForRole`, `app/page.tsx` |
| 3 | `Order.dispatch` + attribution fields | ✓ | `lib/models/Order.ts` `DispatchSchema` |
| 4 | `PATCH /api/orders/[id]/dispatch` — dispatch_editor only | ✓ | `app/api/orders/[id]/dispatch/route.ts` |
| 5 | Loading sheet view/print shows saved dispatch values | ✓ | `components/LoadingSheetBatchEditor.tsx` header/footer |
| 6 | `/orders` — Edit dispatch link for Rashid | ✓ | `app/(app)/orders/page.tsx` |
| 7 | PO creators / Nimra cannot PATCH dispatch (403) | ✓ | API role check |
| 8 | Rashid cannot create POs or edit batches | ✓ | layouts redirect; `canEditBatches` false for dispatch role |

## Build

- `npm run build` — passed.

## Notes

- Manual login test recommended: Rashid → Edit dispatch → Save → print preview shows values.
