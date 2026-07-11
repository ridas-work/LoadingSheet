---
wave: 1
depends_on: []
files_modified:
  - lib/nimraBatchProductLists.ts
  - lib/productionBatchApi.ts
  - app/api/production-batches/route.ts
  - app/api/production-batches/[id]/route.ts
autonomous: true
---

# Plan 01 — Unified product resolution & inferred batch kind

## Objective

Backend accepts any product from the merged list; infers `batchKind` from product name; relaxes drum requirement per user request.

## Tasks

<task id="01-1">
`lib/nimraBatchProductLists.ts`:
- Add `UnifiedBatchProductOption { name, group: "dispatch" | "custom" }`.
- Add `listUnifiedBatchProductOptions()` — dispatch families + custom-box names, deduped by `nimraProductKey`, custom wins `group: "custom"` when name collides.
- Add `inferBatchKindForProduct(resolvedName)` → `custom_box` if name in custom list, else `standard`.
- Add `resolveUnifiedBatchProduct(input)` → canonical name or null.
</task>

<task id="01-2">
`lib/productionBatchApi.ts`:
- `resolveBatchProduct` — if `batchKind` not passed, use unified resolver + infer kind.
- `parseQcBody` — **drum optional** even for `custom_box` (remove from required missing list).
- Keep HCL required only for standard + viscosity-family products (unchanged).
</task>

<task id="01-3">
`POST /api/production-batches` and `PATCH [id]`:
- Stop requiring client `batchKind`; infer from resolved product.
- Error messages: single “Product must be in the batch product list” (not split by kind).
</task>

## Verification

- [ ] POST batch with custom product (e.g. HAND SANITIZER) without `batchKind` → saves as `custom_box`
- [ ] POST batch with Rhino → saves as `standard`
- [ ] POST custom product without drum → 201 (drum empty allowed)
- [ ] `npm run build` passes

## must_haves

- Server infers batch kind from product
- Unified product resolution works for both lists
- Drum field optional on create/update
