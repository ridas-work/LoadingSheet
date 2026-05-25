# Phase 23 verification — Rashid daily filling bottle counts

**Status:** `passed`  
**Date:** 2026-05-25

## Method

- Code review against Phase 23 `must_haves`.
- Production build: `npm run build`.

## Results

| Must-have | Result |
|---|---|
| Bottle-first API contract | `PATCH /api/batch-filling` accepts `packingLines[]` with bottle counts |
| Ready stock definition | UI and README define ready as capped, labeled/stickered, packed/finished |
| Packing selector support | API returns `packingOptions`; UI renders per-line dropdown |
| Multiple packing lines | `BatchFillingGrid` supports add/remove product rows per batch/day |
| Derived liters | API snapshots per-line liters and top-level filled/ready liter totals |
| Variance compatibility | `computeWasteLiters` still uses system/physical liters plus derived filled/ready liters |
| Backwards compatibility | Legacy liter-only entries are flagged and shown read-only instead of crashing |
| Validation | Bottle counts require whole numbers >= 0; invalid packings return API errors |
| Admin read-only | Admin view uses the same grid with edit controls hidden |

## Build

```text
npm run build — passed
```
