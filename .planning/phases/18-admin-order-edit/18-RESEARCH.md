# Phase 18 — Research: Admin (boss) order edit

## User request

Only **Waleed (boss / admin)** should be able to **edit orders** after they are created — e.g. wrong material, customer wants changes. PO team creates orders; corrections go through management.

## Current behavior

| Role | Create PO | Edit PO lines / qty | Edit batches on sheet | Edit dispatch |
|------|-----------|---------------------|----------------------|---------------|
| `po_creator` | ✅ POST `/api/orders` | ❌ no PATCH | ❌ | ❌ |
| `batch_editor` | ❌ | ❌ | ✅ (if not locked) | ❌ |
| `dispatch_editor` | ❌ | ❌ | assign batches | ✅ dispatch fields |
| `admin` | ❌ | ❌ (read-only today) | ❌ | ❌ read-only |

`GET /api/orders/[id]` exists; **no `PATCH`** for full order update.

## Recommended v1 scope

### Who can edit

- **`admin` only** — new `canEditOrders(role)` in `lib/roles.ts`
- PO creators, Nimra, Rashid unchanged

### What boss can edit

Same fields as new-order creation:

- PO number, customer name, city, deadline
- **Standard order:** product lines (cartons / bottles per carton / sample overrides)
- **Mixed sample order:** box count + bottles per product in mix
- **Not in v1:** delete order, change `createdBy` attribution

### Sheet lines & batches

On save, **rebuild** `sheetLines` from items (reuse `buildSheetLines` / `buildMixedSampleSheetLines`).

**Preserve batch assignments** where possible: after rebuild, copy `batchNo` / `componentBatches` from old lines keyed by `(boxNo, productName, lineKind)`.

New/changed rows → empty batch (Rashid re-assigns).

### Warnings (UI, not blocking v1)

- If any sheet line already has a batch → show notice: “Batch assignments kept where rows match; check loading sheet after edit.”
- If on a dispatch trip → show notice: “Order is on a vehicle trip.”

### Audit (optional v1)

- `adminEditedAt`, `adminEditedByName` on Order (set on PATCH)

### Routes

| Route | Purpose |
|-------|---------|
| `/orders/[id]/edit` | Boss-only edit form (prefill from order) |
| `PATCH /api/orders/[id]` | Admin only; shared validation with POST |

### API design

- Extract `parseAndValidateOrderBody()` from `app/api/orders/route.ts` into `lib/orderPayload.ts` (POST + PATCH share).
- PATCH returns updated order id; 403 for non-admin.

### UI reuse

- Reuse `NewOrderProductGrid` + mixed-sample toggle from `/new-order` in **edit mode** with initial values.
- Orders list: **Edit order** link visible only for `admin`.

## Out of scope

- PO creators editing their own orders
- Packaging auto-deduct (→ Phase 19)
- Version history / diff UI

## Dependencies

- Phase 14–15: catalog grid + mixed sample orders
- Phase 13: admin read access to orders
