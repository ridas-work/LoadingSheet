# Plan 01 — Payload, merge builder, API — complete

## Done

- **`lib/hybridSheetLines.ts`:** `mergeStandardAndCustomSheetLines` — standard `buildSheetLines` chunks, then per-definition `buildMixedSampleSheetLines`, optional `label` on row `productName`, global `boxNo` renumber 1…N.
- **`lib/models/Order.ts`:** `orderKind` includes `hybrid`; persisted **`customCartons`** sub-schema (`boxCount`, `contents`, optional `label`).
- **`lib/orderPayload.ts`:** Legacy **`mixed_sample`** branch unchanged. Standard path parses **`items`** + **`customCartons`**; requires at least one line or carton; sets **`orderKind: "hybrid"`** when `customCartons.length > 0`.
- **`app/api/orders/route.ts`** / **`app/api/orders/[id]/route.ts`:** Persist **`customCartons`** on create and PATCH.

## Verification

- `npm run build` passes (2026-05-20).
