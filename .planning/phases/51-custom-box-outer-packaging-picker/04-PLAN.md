---
wave: 3
depends_on:
  - "51-custom-box-outer-packaging-picker/02-PLAN.md"
  - "51-custom-box-outer-packaging-picker/03-PLAN.md"
files_modified:
  - lib/packagingDeduction.ts
  - app/api/orders/[id]/gate-delivery/route.ts
autonomous: true
---

# Plan 04 — Deduction verification & UAT checklist

## Objective

Prove gate delivery deducts the **selected** outer box (not product family cartons) alongside BOM contents.

## Tasks

<task id="04-1">
Manual/script check: `buildPackagingDeductionPreview` on a sheet line with `lineKind: mixed_sample`, `customBoxCode: custom-box-500ml`, mixed contents with Rhino 750:
- BOM includes bottle/cap/sticker SKUs
- Preview includes **1× CUSTOM BOX 500 ML** (not `rhino-boxes-750ml`)
</task>

<task id="04-2">
Document UAT script in `51-VERIFICATION.md`:
1. Seed packaging → five CUSTOM BOX rows on inventory
2. Nouman: hybrid PO, custom carton, outer **500 ml**, deliver at gate → UIP increases for `custom-box-500ml` + BOM items
3. Admin: legacy PO fix path
4. Negative: missing `customBoxCode` cannot save new PO
</task>

<task id="04-3">
`npm run build` final pass.
</task>

## Verification

- [ ] `51-VERIFICATION.md` written with pass/fail table
- [ ] No `Packaging mapping missing` for custom carton rows with valid `customBoxCode`
- [ ] `npm run build` passes

## must_haves

- End-to-end: rep picks box → sheet stores code → Zaman delivery deducts that box
- Verification doc for factory UAT
