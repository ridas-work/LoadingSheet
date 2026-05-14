# Phase 11 Research — Lock production batches for Nimra

## Problem

Nimra can **edit** any production batch via `/production/batches/[id]/edit` even after Rashid has assigned it on loading sheets. **Delete** is already blocked when `usedLiters > 0`, but **PATCH is not**.

Once a batch is part of dispatch, QC fields (pH, solids, appearance, etc.) must stay fixed for audit / complaint lookup.

When a batch is **fully consumed** (0 L remaining in the pool), Nimra should see it as **Empty / Done**, not as an editable open batch.

## Current behavior

| Action | Guard today |
|--------|-------------|
| DELETE batch | Blocked if any liters assigned on orders |
| PATCH batch | No guard — full edit always allowed |
| List UI | No status column; Edit/Delete always shown |
| Detail page | Edit link always for `batch_editor` |

Usage computed via `accumulateBatchUsageFromOrders` + `normalizeBatchNo` (same as DELETE).

## Proposed batch status (Nimra list)

| Status | Rule | Nimra UI |
|--------|------|----------|
| **Available** | `usedLiters === 0` | Edit + Delete |
| **In use** | `usedLiters > 0` and `remaining > 0` | View only; show `X L remaining` |
| **Empty** | `remaining <= 0` (fully allocated) | View only; badge **Empty** |

`remaining = totalLiters - usedLiters` (round like `batchVolume`).

## Lock rule (API + UI)

**`isProductionBatchLocked(usedLiters)` → `usedLiters > 0`**

- PATCH `/api/production-batches/[id]` → 403 with clear message
- DELETE — already blocked; keep as-is
- Hide Edit/Delete on list; detail shows read-only + status badge
- Edit page redirect to detail if locked

Optional: allow Nimra to edit **only** if never used — matches delete policy.

## Shared helper

`lib/productionBatchStatus.ts`:

- `batchUsageFromOrders(batchNo, orders, catalog)` → used liters
- `productionBatchStatus(totalLiters, usedLiters)` → `available | in_use | empty`
- `isProductionBatchLocked(usedLiters)` → boolean

Reuse in list page, detail, edit page, API.

## Out of scope

- Unlock / admin override
- Auto-archive empty batches from list
- Changing Rashid assignment when batch locked (already separate flow)
