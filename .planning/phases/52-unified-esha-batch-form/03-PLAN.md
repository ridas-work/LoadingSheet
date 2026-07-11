---
wave: 2
depends_on: ["52-unified-esha-batch-form/01-PLAN.md"]
files_modified:
  - app/(app)/production/batches/page.tsx
  - app/(app)/production/batches/[id]/page.tsx
  - app/(app)/production/batches/[id]/edit/page.tsx
autonomous: true
---

# Plan 03 — Batch list, detail, and edit alignment

## Objective

Production batch pages reflect unified model; no confusing Standard/Custom type column as primary UX.

## Tasks

<task id="03-1">
`/production/batches` list:
- Remove or demote **Type** column (Standard / Custom box).
- Show **Product** prominently; optional small badge “Drum” if `drum` non-empty.
</task>

<task id="03-2">
Batch detail `[id]/page.tsx` — keep showing drum/customer/HCL when present; remove “Custom box / drum batch” vs “Standard” heading in favor of product name + purpose (Regular/Sample).
</task>

<task id="03-3">
Edit page passes `initialBatchKind` only for legacy display; form uses unified catalog.
</task>

## Verification

- [ ] Batch list readable without type toggle context
- [ ] Edit existing custom_box batch — product appears in unified dropdown
- [ ] `npm run build` passes

## must_haves

- List/detail consistent with unified form
- Legacy batches editable without switching type
