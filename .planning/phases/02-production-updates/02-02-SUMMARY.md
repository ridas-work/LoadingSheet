---
phase: "02"
plan: "02"
subsystem: "loading-sheet"
completed: "2026-05-11"
---

# Phase 02 Plan 02 Summary

## What shipped

- **Rule B** documented in REQUIREMENTS: **cartons × bottles per carton**; one printed row per carton.
- Order schema: `items[].productName`, `items[].boxes`, `items[].bottlesPerBox`; persisted **`sheetLines`** for audits (batch + weight placeholders).
- `POST /api/orders` builds `sheetLines` via `lib/buildSheetLines.ts`.
- `GET /api/orders/[id]` for JSON fetch.
- **`/orders/[id]/loading-sheet`** print-ready page (table + header/footer placeholders + `PrintSheetButton`).
- New Order UI: **Cartons**, **Bottles / carton** (default 10); success links to loading sheet.
- Legacy orders with only `items[].bottles` still render sheet via fallback rebuild.

## Verification

- `npm run build` passes.
