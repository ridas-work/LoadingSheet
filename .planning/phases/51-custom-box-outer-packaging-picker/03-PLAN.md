---
wave: 2
depends_on: ["51-custom-box-outer-packaging-picker/01-PLAN.md"]
files_modified:
  - components/AdminOrderEditForm.tsx
  - app/(app)/orders/[id]/edit/page.tsx
  - lib/orderPoDetail.ts
autonomous: true
---

# Plan 03 — Admin edit, legacy orders, and PO display

## Objective

Waleed can fix legacy custom cartons missing outer box; all PO views show which box will be deducted.

## Tasks

<task id="03-1">
`AdminOrderEditForm` + edit page:
- Ensure `draftsFromSavedCartons` restores `customBoxCode`; suggest when missing.
- Amber banner when any loaded carton has empty `customBoxCode`: *“Select outer box size before next delivery.”*
- Same validation as new-order on submit.
</task>

<task id="03-2">
`orderPoDetail.ts` / `OrderPoDetailPanel`: confirm custom carton sections show outer box label (`customCartonBoxLabel`) — add if missing in list/detail strings.
</task>

<task id="03-3">
Waleed approvals + admin orders expanded PO: outer box visible on custom carton lines in detail panel.
</task>

## Verification

- [ ] Legacy hybrid PO without `customBoxCode` → admin edit shows warning + empty select → save with **1 L** → gate preview includes `custom-box-1l`
- [ ] PO detail text reads e.g. *“Custom carton ×2 — outer box: 500 ml”*
- [ ] `npm run build` passes

## must_haves

- Boss can repair legacy custom cartons
- Operators see outer box choice in PO detail before dispatch
