# Phase 16 — Research: Packaging inventory (Rashid)

## User request

Track **packaging materials** the factory holds — **bottles, caps, stickers**, and similar — not finished product liters. **Rashid** (dispatch) should record **how much of each** is on hand. Later, when production fills bottles or orders ship, the system should **deduct** usage automatically. For now: **dedicated route** for Rashid to enter and maintain counts.

## Distinction from existing modules

| Module | What it tracks | Who |
|--------|----------------|-----|
| Production batches (`/production/batches`) | Prepared **liquid** batches (liters, QC) | Nimra |
| Dispatch trips (`/dispatch/trips`) | Vehicle, POs, batch assignment on loading sheets | Rashid |
| **Packaging inventory (new)** | **Empty** bottles, caps, stickers, etc. on the shelf | Rashid |

No overlap with `ProductPacking` (carton catalog for POs) — packaging items are **consumables**, not sellable SKUs.

## Recommended v1 scope (this phase)

### Data model

**`PackagingItem`** (master catalog, seeded):

- `code` — slug, e.g. `bottle-rhino-750`, `cap-28mm`, `sticker-rhino-750`
- `name` — display name
- `category` — `bottle` | `cap` | `sticker` | `label` | `other`
- `unit` — default `pcs` (pieces)
- `active` — bool
- Optional: `notes`, `linkedProductCode` — **future** link to `ProductPacking.code` for auto-deduct (not required v1)

**`PackagingStockMovement`** (ledger, append-only):

- `itemCode` → PackagingItem
- `quantityDelta` — positive = received/found, negative = used/lost (v1: Rashid can set absolute via “count” API that writes delta)
- `quantityAfter` — snapshot after movement (easier list UI)
- `reason` — `count` | `received` | `used` | `adjustment` | `other`
- `note` — free text
- `recordedByUserId`, `recordedByName`, `createdAt`

**Current on-hand** = sum of `quantityDelta` per item, or store denormalized `onHand` on item updated on each movement (denormalized is simpler for Rashid’s grid).

Prefer: **`PackagingItem.onHand`** updated atomically when Rashid saves, plus **movement log** for audit.

### Routes (Rashid)

New section under dispatch (same role, separate nav):

| Route | Purpose |
|-------|---------|
| `/dispatch/inventory` | Grid: all packaging items by category, **on-hand qty**, last updated |
| `/dispatch/inventory/[code]/adjust` | Set new count or +/- adjustment + note |

Alternative top-level `/inventory` — user asked for “proper another route”; **`/dispatch/inventory`** keeps Rashid’s world together and reuses `dispatch` layout guards.

### API

- `GET /api/packaging-items` — list with `onHand`, category filter
- `PATCH /api/packaging-items/[code]` — Rashid only: `{ onHand }` or `{ adjustment, note }` → writes movement + updates onHand
- `GET /api/packaging-items/[code]/movements` — recent history (optional v1: last 20)

### Access control

- **Edit:** `dispatch_editor` only (`canEditDispatch`)
- **Read:** `admin` read-only (Waleed oversight), same pattern as dispatch trips
- Others: no access

### UI (Rashid)

- Table grouped by **category** (Bottles, Caps, Stickers, …)
- Columns: Item name, **On hand**, Unit, **Update** button
- Update modal/page: “Physical count” input (sets absolute on-hand) + optional note
- Footer hint: “Future: counts will reduce automatically when production uses materials.”

### Seed data

`data/packaging-items.json` — starter list; user expands over time. Example categories:

- Bottles (by size/product line as needed)
- Caps
- Stickers / labels

`npm run seed:packaging` script mirroring `seed:products`.

## v2 — Future auto-deduct (Phase 17+, not this phase)

- Map `PackagingItem` → `ProductPacking` (bottles + cap + sticker per filled unit)
- On order sheet line save or batch fill event: compute `bottlesPerBox × cartons` × components → post negative movements
- Warn if insufficient stock before dispatch
- Nimra production “bottles filled” event as alternate trigger

Document in ROADMAP as follow-up so v1 ships without blocking on order-integration complexity.

## Risks / decisions

| Topic | Decision |
|-------|----------|
| Negative on-hand | Reject save if result &lt; 0 |
| Who seeds catalog | JSON seed; Rashid does not create new item types in v1 (admin/dev adds to JSON) |
| Waleed | Read-only inventory page via admin nav link |
| Home path for Rashid | Stay `/dispatch/trips`; inventory is second nav link |

## Files likely touched

- `lib/models/PackagingItem.ts`, `PackagingStockMovement.ts`
- `data/packaging-items.json`, `scripts/seed-packaging-items.ts`
- `app/api/packaging-items/`, `app/(app)/dispatch/inventory/`
- `lib/roles.ts` — optional `canEditPackagingInventory` alias of dispatch editor
- `app/(app)/layout.tsx` — nav link for Rashid + admin
- `README.md`
