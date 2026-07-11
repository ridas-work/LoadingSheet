---
wave: 2
depends_on: ["51-custom-box-outer-packaging-picker/01-PLAN.md"]
files_modified:
  - components/CustomCartonBuilder.tsx
  - app/(app)/new-order/page.tsx
autonomous: true
---

# Plan 02 — Outer box picker for PO creators (Nouman / Javeria / Aslam / Ahtisham)

## Objective

Restore the **Outer box size** control on every custom carton so reps choose which Haider box is deducted on delivery.

## Tasks

<task id="02-1">
`CustomCartonBuilder.tsx`:
- Import `CUSTOM_CARTON_BOX_OPTIONS`, `customCartonBoxLabel` from `lib/customCartonBoxes.ts`.
- Add required `<select>` **Outer box size** on each carton card (between carton count and label fields).
- Wire `customBoxCode` on draft; show `cartonError(errors, ci, "customBoxCode")`.
- When contents change, if `customBoxCode` empty call `suggestCustomBoxCodeFromContents(rows, catalogProducts)` and pre-fill (user can override).
- Update help copy: distinguish **product container size** (per row) vs **outer shipping box** (per carton).
</task>

<task id="02-2">
`buildCustomCartonsPayload`: always include `customBoxCode` (lowercase) when non-empty.
</task>

<task id="02-3">
`/new-order/page.tsx`:
- Client validation: each active custom carton must have valid `customBoxCode` before fetch (use `assertValidCustomBoxCode` or duplicate check).
- Map errors to `customCartons.{i}.customBoxCode`; scroll to first error (existing pattern).
</task>

## Verification

- [ ] Nouman creates hybrid PO: custom carton + pick **500 ml** outer box → saves; loading sheet mixed rows show code
- [ ] Submit blocked when outer box unset
- [ ] Suggest pre-fills when adding Rhino 750 ml line (suggests appropriate size)
- [ ] `npm run build` passes

## must_haves

- All four PO creators see and must fill outer box on custom cartons
- Payload sends `customBoxCode` per carton
- Clear UX separating inner BOM products from outer box choice
