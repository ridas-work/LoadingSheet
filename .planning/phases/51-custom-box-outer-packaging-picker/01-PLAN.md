---
wave: 1
depends_on: []
files_modified:
  - lib/orderPayload.ts
  - lib/customCartonBoxes.ts
  - data/packaging-items.json
  - scripts/seed-packaging-items-for-screenshot-products.ts
autonomous: true
---

# Plan 01 — Require outer box on custom cartons (server + seed)

## Objective

Make `customBoxCode` **mandatory** whenever a PO includes custom cartons, so gate delivery always knows which Haider box SKU to deduct.

## Tasks

<task id="01-1">
In `lib/orderPayload.ts` `parseCustomCartons()`:
- After building each carton with `contents.length > 0`, call `assertValidCustomBoxCode(customBoxCodeRaw)` — treat empty as error on field `customCartons.{ci}.customBoxCode`.
- Do not push carton into array unless `customBoxCode` is valid.
</task>

<task id="01-2">
Verify `mergeStandardAndCustomSheetLines` / `buildMixedSampleSheetLines` always stamp `customBoxCode` from carton def onto each generated `mixed_sample` sheet line (already in `hybridSheetLines.ts` — add regression comment or unit-less grep check in verification).
</task>

<task id="01-3">
Confirm five `custom-box-*` SKUs exist in `data/packaging-items.json` with `category: box`, `deductAs: box`. Re-run or document packaging seed script so Haider `/dispatch/inventory` shows them.
</task>

## Verification

- [ ] POST `/api/orders` with `customCartons` missing `customBoxCode` → 400 with field error
- [ ] PATCH `/api/orders/[id]` same
- [ ] Hybrid PO with valid `custom-box-500ml` saves; sheet lines in DB include `customBoxCode`
- [ ] `npm run build` passes

## must_haves

- Server rejects custom cartons without outer box code
- Saved sheet lines carry `customBoxCode` for deduction engine
- Packaging catalog contains deductable custom box SKUs
