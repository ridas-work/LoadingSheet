# Phase 28 — Plan 01 Summary

## Done

- Added five Haider packaging SKUs in `data/packaging-items.json`: `custom-box-5l-jar`, `custom-box-1l`, `custom-box-500ml`, `custom-box-250ml`, `custom-box-100ml`.
- `lib/customCartonBoxes.ts` — options, validation, suggest-from-contents helper.
- `CustomCartonDef` + Order `customCartons` / `sheetLines` store `customBoxCode`.
- `mergeStandardAndCustomSheetLines` stamps `customBoxCode` on each mixed row.
- `parseCustomCartons` requires valid `customBoxCode`.
- `packagingDeduction` uses `customCartonBoxes` map (direct item code) instead of `mixedBoxFamilies` when `customBoxCode` is set; ready-shelf skip unchanged.
- `PackagingItem.customCartonBox` flag; seed script upserts it.

## Note

Standalone `mixed_sample` orders (no hybrid `customCartons`) still use legacy family-based mixed box mapping until migrated.
