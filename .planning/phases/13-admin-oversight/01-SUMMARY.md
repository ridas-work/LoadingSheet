# Phase 13 Plan 01 — Summary

**Status:** Complete

## What shipped

- `lib/roles.ts` — `isAdmin`, `adminCanViewOperations`, `canCreateOrders`, `canEditProductionBatches`, `canEditDispatch`
- Admin allowed on `/orders`, `/production/batches`, `/dispatch/trips`
- Admin blocked from `/new-order`, batch new/edit, `/dispatch/trips/new`
- Removed admin redirect from orders layout

## Verification

- `npm run build` passes
