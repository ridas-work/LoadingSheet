# Phase 26 research — Ready bottle stock ledger (legacy + Rashid)

## User question

> Some bottles were already filled before this software existed. Can we add them so the next order deducts from ready stock first, and only when that runs out do we fill more from batches?  
> Put it on Rashid's daily filling — he enters bottles already in production ready to go; when orders ship, subtract from that pool.

## Recommendation: **Yes — Rashid's filling page is the right home**

Phase 23 already has **Ready to deliver (bottles)** per batch/day, but that is a **daily log field**, not a **running product-level balance**. Phase 26 adds a **ledger** that:

1. Accepts **opening balance** (legacy stock before go-live)
2. **Increases** when Rashid records newly finished bottles
3. **Decreases** when orders **leave production** (gate: out for delivery)
4. **Shows on-hand per SKU** so dispatch/production see shortages before assigning batches

## What exists today

| Area | Behavior |
|------|----------|
| `/dispatch/filling` | Rashid enters `filledBottlesToday` + `readyToDeliverBottles` per batch/packing line per day |
| Packaging UIP (Phase 25) | Empty bottles/caps consumed at **fill** and **deliver** — tracks **packaging materials**, not finished product bottles on shelf |
| Gate delivery (Zaman) | `out_for_delivery` / `delivered` — no finished-goods deduct |
| Batch assignment (Rashid) | Assigns liquid batches to PO rows — does not check finished bottle pool |

**Gap:** No persistent **finished-goods ready pool** per catalog product.

## Domain model (v1)

### `ReadyBottleStock` (one row per `productCode`)

- `onHandBottles` — current count Rashid trusts on the production floor
- `openingBalanceSetAt` — first legacy seed timestamp (optional)
- `updatedAt` / `updatedBy`

### `ReadyBottleMovement` (audit)

| Reason | Who | When |
|--------|-----|------|
| `opening_balance` | Rashid (or admin once) | One-time / adjust legacy stock |
| `filling_ready` | System on filling save | Delta of `readyToDeliverBottles` per product line (idempotent, like Phase 25 UIP) |
| `dispatch_out` | System on gate `out_for_delivery` | Bottles on loading sheet per product |
| `dispatch_return` | System on `pending_redelivery` | Restore bottles that came back on truck |
| `manual_adjust` | Rashid | Corrections after physical count |

### Deduction timing

| Option | Pros | Cons |
|--------|------|------|
| On PO create | Early reservation | Too early — PO may cancel/edit; blocks creators |
| On dispatch trip assign | Good for planning | Trip can change before leave |
| **On gate out for delivery (chosen v1)** | Matches physical leave from production house | Slight lag vs PO entry |
| On delivered only | Simple | Too late for fill planning |

**v1:** Deduct on **`out_for_delivery`**; restore on **`pending_redelivery`**. Idempotent per order (like `packagingDeductedAt`).

### Relationship to daily filling `readyToDeliverBottles`

Treat as **"new bottles finished today"** increment to ledger (delta vs previous save for same batch+date+product), **not** overwrite of total shelf count. Rashid still uses the same field; ledger aggregates by product across batches.

Opening balance is a **separate one-time panel** — "Bottles already on shelf before software" — so legacy stock does not require fake batch rows.

## UI placement

1. **`/dispatch/filling`** — top section: **Ready stock by product** (on-hand, last movement); **Set opening balance** (Rashid, first week only prominent)
2. **Loading sheet / dispatch trip** — read-only badge: "Ready stock: 120 · this PO needs 50" (green/amber/red)
3. **Admin** — read-only movements list (like packaging movements)

## Risks / out of scope v1

- **Not** auto-reserving stock when PO is created (future phase if needed)
- **Not** per-batch FIFO of which bottles left (product-level pool only)
- Custom cartons / mixed lines: sum bottles per resolved catalog product name
- Bundles: use sheet line bottle counts as today

## Dependencies

- Phase 23 — bottle-based filling lines + `productCode`
- Phase 21 — gate status transitions
- Phase 25 — pattern for idempotent delta ledger (reuse mental model)

## RESEARCH COMPLETE
