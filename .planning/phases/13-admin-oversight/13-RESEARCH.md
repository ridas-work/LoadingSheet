# Phase 13 Research — Admin oversight (boss expanded access)

## User request

**Waleed Intisar** (boss / `admin`) should have **almost all access** to **see** what is happening:

1. **What Nimra is adding** — production batch registry (QC fields, liters, status)
2. **Who entered POs** — which PO team member created each order
3. Broader visibility across orders, batches, and dispatch (read-only oversight)

## Current state (Phase 12)

| Area | Admin today |
|------|-------------|
| Home | `/admin` — pending orders summary only |
| Nav | **Summary** link only |
| `/orders` | **Redirected** to `/admin` |
| `/production/batches` | Technically allowed by production layout, but no nav link |
| `/dispatch/trips` | **Blocked** — dispatch layout requires `dispatch_editor` |
| Loading sheets | Can open if URL known (no orders list) |

## Data already captured (no new schema required for v1)

| Entity | Attribution fields |
|--------|-------------------|
| `Order` | `createdByName`, `createdByUserId`, `createdAt` |
| `ProductionBatch` | `createdByName`, `createdByUserId`, `preparedAt`, QC fields |
| `Order` (Rashid) | `batchUpdatedByName`, `dispatchUpdatedByName` |
| `DispatchTrip` | `createdByName` |

Nimra batch **detail** page already shows “Registered by” (`/production/batches/[id]`).

## Recommended access model (v1)

**Read-only oversight** — boss can **view** everything operational staff do; **cannot** create POs, register batches, assign batches, or edit dispatch (preserves audit integrity).

| Action | PO team | Nimra | Rashid | Waleed |
|--------|---------|-------|--------|--------|
| Create PO | ✓ | | | |
| View orders + creator | ✓ | ✓ | ✓ | **✓** |
| View loading sheet | ✓ | ✓ | ✓ | **✓** |
| Register / edit batch | | ✓ | | |
| View batch list + QC detail | | ✓ | ✓ | **✓** |
| Dispatch / assign batches | | | ✓ | |
| View dispatch trips | | | ✓ | **✓** |
| Pending orders summary | | | | **✓** |

If Waleed later needs **edit** rights, that is a separate phase (higher risk).

## Implementation approach

### 1. Role helpers (`lib/roles.ts`)

- `isAdmin(role)` 
- `isReadOnlyOversight(role)` → admin
- Centralize “who can mutate” checks instead of scattering `!== "admin"` redirects

### 2. Layout guards

- **Remove** `admin → /admin` redirect from `orders/layout.tsx` and `new-order/layout.tsx`
- **`new-order/layout.tsx`**: keep redirect for admin → `/orders` or `/admin` (no PO creation)
- **`dispatch/layout.tsx`**: allow `admin` **or** split read-only admin pages under `/admin/dispatch` (prefer **same routes**, hide mutate UI when `isAdmin`)

### 3. App nav (`app/(app)/layout.tsx`)

Admin links:

- **Summary** → `/admin`
- **Orders** → `/orders` (with **Created by** column)
- **Production batches** → `/production/batches`
- **Dispatch trips** → `/dispatch/trips` (read-only)

### 4. Orders list

- Select `createdByName` in `orders/page.tsx`
- Pass to `OrdersListWithTrips` — show **Entered by** column (visible for admin; optional for all roles)
- No trip multi-select for admin (`isDispatchEditor` stays false)

### 5. Production batches

- Page already hides **Add batch** / row actions when `role !== batch_editor`
- Admin gets full list + **View** detail (QC audit)
- Optional: default sort/filter “recent first” (already sorted by `preparedAt`)

### 6. Dispatch trips

- Allow admin into `/dispatch/trips` and trip detail
- Hide **New trip**, **Assign batches**, **Edit dispatch** for admin
- View loading sheets from trip page (existing links)

### 7. APIs

- Audit GET endpoints — ensure admin not blocked (most already allow any authenticated user)
- Keep POST/PATCH **forbidden** for admin on orders, batches, dispatch, batch-assignments

### 8. Admin home (`/admin`)

Optional enhancement: small **overview cards** linking to Orders / Batches / Trips + summary table below or tabbed — can be part of plan 02.

## Out of scope (v1)

- Admin editing orders or batches
- User management UI
- Real-time notifications / activity feed collection
- Export audit log CSV

## Verification

- Waleed logs in → sees nav: Summary, Orders, Production batches, Dispatch trips
- Orders list shows **who created** each PO
- Production batches list + detail show Nimra’s entries (read-only, no Edit)
- Dispatch trips visible read-only
- Waleed **cannot** POST new order, batch, or dispatch trip
