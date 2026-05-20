# Phase 20 verification — Nimra add catalog product

**Status:** passed  
**Date:** 2026-05-19

## Must-haves (from plans)

| Check | Result |
|-------|--------|
| `POST /api/product-packings` — `batch_editor` only; 403 for others | ✓ `roleFromSession(...) !== "batch_editor"` → 403 |
| Validates name, slug code, bottlesPerCarton ≥ 1, liters > 0 or infer | ✓ `lib/productPackingValidation.ts` |
| `batchFamily` optional; defaults to `name` when empty | ✓ |
| Unique code — 409 if exists | ✓ pre-check + duplicate key 11000 |
| **Add product** on `/production/batches` for `batch_editor` only | ✓ page gates toolbar |
| Modal: code, name, batch family optional, BPC, LPB optional; success refresh | ✓ `AddProductModal.tsx` |
| README documents Add product | ✓ workflow §2 |

## Evidence

- Build: `npm run build` succeeded (Next.js 16.2.6).

## Manual UAT (optional)

1. Sign in as `nimra` → `/production/batches` → **Add product** → save a test code → **Add batch** and confirm product appears in dropdown (may require navigating to new batch after refresh).
