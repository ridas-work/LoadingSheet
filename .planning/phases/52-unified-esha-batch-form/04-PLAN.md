---
wave: 3
depends_on:
  - "52-unified-esha-batch-form/02-PLAN.md"
  - "52-unified-esha-batch-form/03-PLAN.md"
files_modified:
  - lib/batchVolume.ts
  - app/(app)/orders/[id]/loading-sheet/page.tsx
  - .planning/phases/52-unified-esha-batch-form/52-VERIFICATION.md
autonomous: true
---

# Plan 04 — Rashid assignment verification & UAT

## Objective

Confirm Rashid can assign unified batches on loading sheets; document matching rules; final build.

## Tasks

<task id="04-1">
Trace assignment path: `regularProductionBatchMongoFilter` → loading sheet pool → `findPoolBatch` / `productsMatch`.
- Verify custom-box batches (e.g. HAND SANITIZER) appear in picker when `productName` matches line.
- If gap: add `productsMatch` fallback — normalized string equality when batch product is in custom-box list and catalog has no packing (minimal, only if needed).
</task>

<task id="04-2">
Write `52-VERIFICATION.md` UAT script:
1. Esha: new regular batch, product **Rhino** from unified list → Rashid assigns on PO loading sheet
2. Esha: new regular batch, **HAND SANITIZER** + optional drum → assign on matching “Other” PO line
3. Sample production unchanged — still separate purpose toggle
4. Edit legacy custom_box batch — product preserved
</task>

<task id="04-3">
`npm run build` final pass.
</task>

## Verification

- [ ] `52-VERIFICATION.md` complete with pass/fail table
- [ ] No regression: sample batches excluded from regular PO pool
- [ ] `npm run build` passes

## must_haves

- Rashid assignment works for both dispatch families and custom products
- UAT checklist for factory sign-off
