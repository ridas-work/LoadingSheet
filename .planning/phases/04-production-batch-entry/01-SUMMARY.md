# Plan 01 Summary — Production batch entry (Nimra)

**Status:** Complete  
**Wave:** 1

## Delivered

- **`batch_editor` role** — `lib/auth.ts` allows `po_creator` and `batch_editor`; session carries `role`.
- **`lib/roles.ts`** — `homePathForRole`, `roleFromSession`.
- **Nimra seeded** — `scripts/seed-users.ts` default list includes `nimra` / `Nimra-Batch-01`.
- **Route guards** — `new-order/layout.tsx` redirects batch_editor; `production/layout.tsx` redirects po_creator.
- **Role-based home** — `/` and login callback route to `/new-order` or `/production/batches`.
- **`GET /api/orders`** — order list with batch progress (`batch_editor` only).
- **`PATCH /api/orders/[id]/batches`** — update `sheetLines[].batchNo` by `boxNo` (`batch_editor` only).
- **`POST /api/orders`** — restricted to `po_creator`.
- **UI** — `/production/batches` (order list), `/production/orders/[id]` (per-row batch inputs + save).
- **Order model** — `batchUpdatedByUserId`, `batchUpdatedByName`, `batchUpdatedAt`.
- **README** — Nimra credentials documented.

## Verification

- `npm run build` — passed.

## Notes

- Per-row batch entry (strategy A from plan).
- Weight column read-only on production editor (not shown in table; loading sheet still shows weight when filled later).
