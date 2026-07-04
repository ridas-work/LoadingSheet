---
phase: 45-print-trip-accessory-stock
plan: 04
subsystem: ui
tags: [nextjs, react, chemical-materials, accessory-stock, approvals]

requires:
  - phase: 45-print-trip-accessory-stock
    provides: Accessory stock data model, request snapshots, and approval shortage validation from Plan 03
provides:
  - Esha accessory stock card for Shoppers, Drums, and Seals on chemical intake
  - Ramazan optional accessory request fields and recent request summaries
  - Waleed approval table accessory stock visibility and shortage blocking
affects: [chemical-intake, chemical-requests, admin-approvals]

tech-stack:
  added: []
  patterns:
    - Client-side stock/request UI reuses `/api/chemical-materials` and request APIs
    - Fixed accessory codes remain centralized in `CHEMICAL_ACCESSORIES`

key-files:
  created:
    - .planning/phases/45-print-trip-accessory-stock/04-SUMMARY.md
  modified:
    - app/(app)/production/chemical-intake/page.tsx
    - app/api/chemical-materials/route.ts
    - app/api/chemical-materials/[code]/route.ts
    - components/ChemicalIntakeForm.tsx
    - components/ChemicalMaterialsPortal.tsx
    - components/AdminChemicalRequestsTable.tsx
    - lib/chemicalMaterials.ts
    - lib/roles.ts

key-decisions:
  - "Accessory stock UI lives on Esha's `/production/chemical-intake` page instead of opening the full chemical inventory editor."
  - "Esha can create/update only fixed accessory rows: Shoppers, Drums, and Seals."
  - "Ramazan's main material table stays chemical-only; accessories are optional fields inside a chemical request."

patterns-established:
  - "Accessory request display shows accessory quantities under the chemical name while keeping the main quantity column chemical-only."
  - "Waleed's approval table compares all requested stock lines before enabling approval, while the API remains the source of truth."

duration: 7min
completed: 2026-07-04
---

# Phase 45 Plan 04: Accessory Stock UI Summary

**Accessory stock and request UI for Shoppers, Drums, and Seals, with Waleed approval shortage visibility before approval**

## Performance

- **Duration:** 7 min
- **Started:** 2026-07-04T07:57:00Z
- **Completed:** 2026-07-04T08:04:03Z
- **Tasks:** 5
- **Files modified:** 8 code files plus this summary

## Accomplishments

- Added an Esha-facing `Accessory stock` card on `/production/chemical-intake` for Shoppers, Drums, and Seals, using `pcs`.
- Added Ramazan optional packing/accessory request fields and submitted only positive accessory quantities.
- Added accessory summaries to Ramazan recent requests without changing the main chemical quantity column.
- Added Waleed accessory request/current stock display and disabled approval when loaded stock is less than requested.
- Kept shortage copy consistent with `Insufficient stock` and `stock is less` wording.

## Task Commits

1. **Task 1: Esha accessory stock UI** - `e664fea` (feat)
2. **Tasks 2-3: Ramazan request form and history** - `f8e6992` (feat)
3. **Task 4: Waleed approval table** - `cfce702` (feat)
4. **Task 5: Copy, labels, and focused validation cleanup** - `27186d5` (fix)

**Plan metadata:** recorded in the final docs commit for this summary and state update.

## Files Created/Modified

- `app/(app)/production/chemical-intake/page.tsx` - Renders the accessory stock card above Esha's existing intake panel.
- `app/api/chemical-materials/route.ts` - Allows fixed accessory row creation through the existing material API for permitted roles.
- `app/api/chemical-materials/[code]/route.ts` - Allows fixed accessory stock updates while preserving chemical stock restrictions.
- `components/ChemicalIntakeForm.tsx` - Adds `AccessoryStockCard` and keeps chemical intake search scoped to chemical rows.
- `components/ChemicalMaterialsPortal.tsx` - Adds optional accessory request fields and recent-request accessory summaries.
- `components/AdminChemicalRequestsTable.tsx` - Shows requested accessories/current stock and blocks known shortages.
- `lib/chemicalMaterials.ts` - Exposes the accessory stock permission helper with chemical material utilities.
- `lib/roles.ts` - Adds Esha/admin accessory stock permission without broad chemical stock access.

## Decisions Made

- Put Esha's accessory stock maintenance inside `/production/chemical-intake`, matching the plan recommendation and avoiding broad chemical inventory permissions.
- Filter accessory rows out of Ramazan's main chemical material table so accessories are requested only with a chemical request.
- Use the existing `/api/chemical-materials` API with a narrower permission path instead of introducing a new endpoint.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added narrow Esha accessory stock API permission**

- **Found during:** Task 1 (Esha accessory stock UI)
- **Issue:** The existing stock API rejected Esha (`batch_editor`) for all create/update stock calls, so the planned UI could not save accessory stock through the same API.
- **Fix:** Added `canEditChemicalAccessoryStock` and allowed Esha/admin to create or update only the fixed accessory rows.
- **Files modified:** `lib/roles.ts`, `lib/chemicalMaterials.ts`, `app/api/chemical-materials/route.ts`, `app/api/chemical-materials/[code]/route.ts`
- **Verification:** IDE diagnostics clean; build compiled before stopping at the unrelated `docx` type error.
- **Committed in:** `e664fea`

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Required for the planned Esha UI to function. Scope stayed limited to fixed accessory rows.

## Verification

- `ReadLints` on all changed code files: passed.
- `npx eslint` on changed UI files with the known existing `react-hooks/set-state-in-effect` rule disabled: passed.
- `npm run build`: production compilation passed, then TypeScript failed on unrelated untracked `scripts/generate-user-manual-docx.ts` importing missing `docx`.

Manual workflow coverage by implementation:

- Esha can create/update Shoppers, Drums, and Seals stock from `/production/chemical-intake`.
- Ramazan can submit a chemical-only request by leaving accessory fields blank or zero.
- Ramazan can submit a chemical request with positive Shoppers, Drums, and/or Seals quantities.
- Waleed sees requested accessories and current accessory stock before approval.
- Waleed approval is disabled for known chemical/accessory shortages, and API shortage errors still display at the top.

## Issues Encountered

- Full build remains blocked by the pre-existing untracked manual generator script missing the `docx` dependency. The plan explicitly excluded that file, so it was not changed.
- Full ESLint still reports existing `react-hooks/set-state-in-effect` patterns in touched components when that repository-wide rule is enabled.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Phase 45 Plan 04 UI scope is complete. The remaining validation blocker is unrelated to this plan: decide whether to install `docx`, exclude `scripts/generate-user-manual-docx.ts` from app type checking, or remove that untracked script before requiring `npm run build` to pass.

---
*Phase: 45-print-trip-accessory-stock*
*Completed: 2026-07-04*
