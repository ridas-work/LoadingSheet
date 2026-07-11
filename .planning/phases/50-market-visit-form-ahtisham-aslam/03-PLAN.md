---
wave: 2
depends_on: ["01-PLAN.md", "02-PLAN.md"]
files_modified:
  - components/MarketVisitForm.tsx
  - app/globals.css
autonomous: true
---

# Plan 03 — Market Visit Form UI

## Objective

Build `MarketVisitForm` component replicating the paper **Market Visit Form** for Ahtisham and Aslam: dated header, availability grid, facing grid, footer remarks, save/submit, print.

## Tasks

<task id="03-1">
Create `components/MarketVisitForm.tsx` (client component):
- Props: `ticket: SerializedTicket`, `readOnly?: boolean`
- Header: "MARKET VISIT FORM DATED" + date input (`marketVisitDate`)
- **Section A — Availability YES/NO**: table with sticky Store Name + Location columns; each SKU column has Yes/No toggle or select per row
- **Section B — FACING DISPLAY IN UNIT**: same row keys; numeric inputs (min 0, integers)
- Per-row Remarks column
- Footer: multiline `marketVisitRemarks`
- Actions: Save draft, Submit (if not readOnly), Print
</task>

<task id="03-2">
Row management: Add store row, Remove row (confirm if data entered), duplicate row optional
- Default 6 empty rows on first open (match paper) or start with 1 + Add row
</task>

<task id="03-3">
Use `MARKET_VISIT_SKUS` for column headers with group rowspan (Washout, Rhino, Fabrito, etc.) matching paper hierarchy.
</task>

<task id="03-4">
Print styles in component module or `globals.css`:
- `@media print` landscape, hide nav/buttons, show both sections, form title + date
- `window.print()` button
</task>

<task id="03-5">
PATCH to `/api/field-visits/[id]` on save; show success/error toasts or inline messages consistent with `FieldVisitDetailForm`.
</task>

## Verification

- [ ] Form renders 14 SKU columns in correct groups
- [ ] Save reload preserves all row data
- [ ] Print preview shows both availability and facing tables
- [ ] Read-only mode disables inputs (for admin / peer view)

## must_haves

- UI matches paper form structure (two sections + footer remarks)
- Usable on desktop with horizontal scroll on narrow screens
- No sample/meeting UI elements present
