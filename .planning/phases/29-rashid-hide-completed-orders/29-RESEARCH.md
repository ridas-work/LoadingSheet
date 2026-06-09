# Phase 29 Research: Hide completed orders from Rashid

## Problem

`/orders` lists **every** `Order` with no `gateDeliveryStatus` filter. Rashid (`dispatch_editor`) sees POs that are already **on a vehicle trip**, **out for delivery**, or **delivered** — with **Assign batches** still visible when batch rows are incomplete. Example: CSD SM FORTRESS on trip ACS-814, delivered at gate, still on the list.

## Current flow

| Stage | Who | Signal on `Order` |
|-------|-----|-------------------|
| PO created | PO team | `gateDeliveryStatus: none` |
| Trip + batches | Rashid | `dispatchTripId`, `sheetLines[].batchNo` |
| Gate handoff | Zaman | `out_for_delivery` (`gateOutAt`) |
| Delivered | Zaman | `delivered` (`gateDeliveredAt`) |
| Return / redo | Zaman | `pending_redelivery` |

`gateEligibleMongoFilter()` in `lib/gateDelivery.ts` already defines when Zaman should see an order (on trip + dispatch header complete). **No inverse filter** exists for Rashid's active queue.

## Affected surfaces

| Surface | File | Issue |
|---------|------|-------|
| Orders list | `app/(app)/orders/page.tsx` | `Order.find({})` — no role filter |
| New trip picker | `app/(app)/dispatch/trips/new/page.tsx` | Same — all orders |
| Trip edit picker | `app/(app)/dispatch/trips/[id]/page.tsx` | Loads all orders for `DispatchTripOrderPicker` |
| Row actions | `components/OrdersListWithTrips.tsx` | Shows Assign batches when `!batchesLocked` regardless of gate status |
| Trip PO rows | `dispatch/trips/[id]/page.tsx` | Assign batches when `!complete` regardless of gate status |

Admin and `po_creator` should **keep** full `/orders` list. Trip history pages (`/dispatch/trips`) may still list past trips; only **active work queues** filter.

## Recommended rule

**Rashid active queue** = orders where `gateDeliveryStatus` is **`none`** or **`pending_redelivery`** (truck returned — needs Rashid again).

**Hide** when status is **`out_for_delivery`** or **`delivered`** (handed to Zaman / closed).

Shared helper beside `gateEligibleMongoFilter()` keeps gate and dispatch rules in one module.

## Edge cases

- **Legacy rows** without `gateDeliveryStatus` field → treat as `none` (Mongo `$nin` on out/delivered covers this).
- **On trip but not yet at gate** (`none` + `dispatchTripId`) → **stay visible** until Zaman marks out — Rashid may still fix batches.
- **Delivered on trip detail** → show read-only "Delivered" / view sheet; no Assign batches.
- **Admin** → unchanged full list.

## Out of scope

- Archiving or deleting orders from DB.
- Changing Zaman gate list filters.
- Hiding trips from `/dispatch/trips` history.
