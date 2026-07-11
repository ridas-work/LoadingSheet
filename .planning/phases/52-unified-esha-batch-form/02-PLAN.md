---
wave: 2
depends_on: ["52-unified-esha-batch-form/01-PLAN.md"]
files_modified:
  - components/ProductionBatchForm.tsx
  - app/api/products/route.ts
autonomous: true
---

# Plan 02 — Single product dropdown & combined form fields

## Objective

Remove Standard vs Custom box toggle; one optgroup dropdown; one field layout with product-driven optional fields.

## Tasks

<task id="02-1">
`GET /api/products` — return `unifiedBatchProducts: UnifiedBatchProductOption[]` from `listUnifiedBatchProductOptions()`.
</task>

<task id="02-2">
`ProductionBatchForm.tsx`:
- **Remove** Batch type toggle (`switchKind`, `batchKind` state on create).
- Fetch `unifiedBatchProducts`; render `<select>` with optgroups **Dispatch families** and **Custom & drum products**.
- Single field block: pH, solids, appearance, provider, quantity (liters).
- Show **HCL** when `isRhinoBatchFamily(productName)` (standard path).
- Show **Viscosity** when applicable (optional).
- Show **Drum** and **Customer** when product infers `custom_box` OR always show as optional below quantity (user: combined optional fields).
- Remove `canSubmit` drum requirement.
- Submit payload: omit `batchKind` (server infers) or send inferred value for clarity.
</task>

<task id="02-3">
Edit mode: same unified product dropdown (disabled if `lockedInUse`); show read-only note “Drum batch” only if `drum` present on legacy row.
</task>

## Verification

- [ ] `/production/batches/new` — no Batch type buttons; one Product dropdown with all names
- [ ] Select HAND SANITIZER → drum field visible; save without drum succeeds
- [ ] Select Brighten → HCL/viscosity rules apply; no drum required
- [ ] `npm run build` passes

## must_haves

- Esha sees all products in one dropdown
- No batch-type toggle on create
- Fields combined; drum/customer optional
