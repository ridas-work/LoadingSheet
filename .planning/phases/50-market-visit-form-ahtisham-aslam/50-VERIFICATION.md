# Phase 50 Verification

**Phase:** Market visit form (Ahtisham & Aslam)  
**Date:** 2026-07-09  
**Status:** passed (automated) / human_needed (UAT)

## Must-haves

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Ahtisham/Aslam get Market Visit Form | ✓ | `defaultVisitKindForUser` + `MarketVisitForm` routing |
| 2 | Availability Y/N + facing units per store | ✓ | Two tables in `MarketVisitForm.tsx`, 14 SKU columns |
| 3 | Nouman/Javeria unchanged | ✓ | `visitKind: sales` default; `FieldVisitDetailForm` for sales |
| 4 | Print layout | ✓ | `@media print` landscape + print-only cell values |
| 5 | No sample approval for market visits | ✓ | `pendingFieldVisitSampleMongoFilter` + PATCH guards |

## Automated checks

- [x] `npm run build` passes

## Human UAT recommended

- [ ] Log in as **ahtisham** or **aslam** → Field visits → New market visit → fill grid → Save → Submit → Print
- [ ] Log in as **nouman** or **javeria** → confirm existing sample/meeting workflow unchanged
- [ ] Waleed approvals → confirm no market visit tickets appear
