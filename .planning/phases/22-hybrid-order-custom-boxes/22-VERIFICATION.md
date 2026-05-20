# Phase 22 verification — Hybrid PO

**Status:** `passed`  
**Date:** 2026-05-20

## Method

- Code review against plan `must_haves` and `npm run build`.

## Plan 01 — must_haves

| Item | Result |
|------|--------|
| Payload `customCartons` + validation | `lib/orderPayload.ts` — `parseCustomCartons`, merged with `items` |
| Merge builder + global `boxNo` | `lib/hybridSheetLines.ts` — `mergeStandardAndCustomSheetLines` |
| `orderKind` + persist `customCartons` | `Order` schema `hybrid` + `customCartons[]` |
| `mixed_sample` path unchanged | Separate branch in `parseOrderBody`, `customCartons: []` |
| POST accepts shape, omittable `customCartons` | POST + PATCH use parser; omit → `[]` |

## Plan 02 — must_haves

| Item | Result |
|------|--------|
| Standard grid + custom section | `new-order/page.tsx` + `CustomCartonBuilder` |
| Submit `items` + `customCartons` | JSON body; server sets `hybrid` when cartons present |
| Client validation | Mirrors server rules for cartons / contents |

## Plan 03 — must_haves

| Item | Result |
|------|--------|
| Admin edit `customCartons` | `AdminOrderEditForm` + `edit/page.tsx` initial |
| Loading sheet | Hybrid uses `mixed_sample` lines from builder — existing UI |
| README / STATE | Updated |

## Build

```text
npm run build — exit 0
```
