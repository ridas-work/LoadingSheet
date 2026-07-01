# Phase 44 Verification

**Status:** passed  
**Date:** 2026-07-01

## Must-haves

| Item | Status | Evidence |
|------|--------|----------|
| ChemicalIntake + ChemicalStockMovement models | ✓ | `lib/models/ChemicalIntake.ts`, `ChemicalStockMovement.ts` |
| Stock helpers (intake +, approve -, validate shortage) | ✓ | `lib/chemicalStock.ts` |
| Esha intake API with upsert material by name | ✓ | `resolveOrCreateMaterial` in POST `/api/chemical-intakes` |
| Approve deducts stock; 400 on shortage | ✓ | `app/api/admin/chemical-material-requests/[id]/route.ts` |
| Admin adjust logs movement | ✓ | `app/api/chemical-materials/[code]/route.ts` |
| Esha UI `/production/chemical-intake` | ✓ | page + `ChemicalIntakeForm.tsx` |
| Ramazan read-only stock | ✓ | `ChemicalMaterialsPortal` `canRequest` only |
| Waleed shortage UI | ✓ | `AdminChemicalRequestsTable` onHand + red rows |
| Nav for Esha | ✓ | `app/(app)/layout.tsx` |
| Build + deploy | ✓ | `npm run build`, pm2 loadingsheet restarted |

## Notes
- Restored several files missing from disk (roles, layout, Rashid plan libs) from build cache / transcripts so full app compiles.
