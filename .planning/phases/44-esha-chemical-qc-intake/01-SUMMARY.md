# Plan 01 Summary — Chemical intake schema + stock ledger

**Status:** Complete

## Delivered
- `lib/models/ChemicalIntake.ts` — QC fields, quantity, outcome
- `lib/models/ChemicalStockMovement.ts` — `intake` | `request_approved` | `admin_adjust`
- `lib/chemicalStock.ts` — `resolveOrCreateMaterial`, `addIntakeToStock`, `deductForApprovedRequest`, `validateStockForApprove`, `adminAdjustStock`
- `canRecordChemicalIntake` (Esha + admin); `canEditChemicalStock` admin-only
- Restored missing foundation: `lib/roles.ts`, chemical models, `app/(app)/layout.tsx`

## User rule
On intake: **if chemical name not in catalog → add it; if exists → update stock on that material** (`resolveOrCreateMaterial`).
