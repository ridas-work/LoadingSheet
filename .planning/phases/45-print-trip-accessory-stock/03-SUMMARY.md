---
phase: 45-print-trip-accessory-stock
plan: 03
subsystem: api
tags: [nextjs, mongoose, chemical-stock, accessories, approval-guards]

# Dependency graph
requires:
  - phase: 44-esha-chemical-qc-intake
    provides: Chemical material catalog, stock movement ledger, and Waleed approval shortage guard
provides:
  - Accessory-aware chemical material catalog rows using `kind`
  - Optional accessory snapshots on chemical material requests
  - Combined approval validation and deduction for chemicals, shoppers, drums, and seals
  - Item-specific shortage responses for Waleed approval
affects:
  - 45-print-trip-accessory-stock/04-PLAN.md
  - chemical material request UI
  - admin chemical request review UI

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Chemical and accessory stock share `ChemicalRawMaterial` with a `kind` discriminator
    - Approval uses aggregated stock-line validation before conditional deductions
    - Deduction prefers Mongo transactions and falls back to rollback-on-failure when transactions are unavailable

key-files:
  created:
    - .planning/phases/45-print-trip-accessory-stock/03-SUMMARY.md
  modified:
    - lib/models/ChemicalRawMaterial.ts
    - lib/models/ChemicalMaterialRequest.ts
    - lib/chemicalMaterials.ts
    - lib/chemicalStock.ts
    - app/api/chemical-materials/route.ts
    - app/api/chemical-material-requests/route.ts
    - app/api/admin/chemical-material-requests/[id]/route.ts

key-decisions:
  - "Reuse the existing chemical stock system for accessories, distinguished by `kind: chemical | accessory`."
  - "Restrict request accessory inputs to the supported stock codes: shoppers, drums, and seals."
  - "Require accessory stock rows to exist as `kind: accessory` before request snapshots are stored."
  - "Aggregate stock lines by code before validation and deduction so duplicate request entries cannot bypass stock checks."

patterns-established:
  - "Serialize optional arrays defensively so old Mongo documents return `accessories: []`."
  - "Return structured shortage arrays alongside human-readable approval errors."

# Metrics
duration: 4 min 51 sec
completed: 2026-07-04
---

# Phase 45 Plan 03: Chemical Accessory Stock Summary

**Chemical request approval now validates and deducts optional shoppers, drums, and seals stock alongside the main chemical quantity.**

## Performance

- **Duration:** 4 min 51 sec
- **Started:** 2026-07-04T07:50:57Z
- **Completed:** 2026-07-04T07:55:48Z
- **Tasks:** 5
- **Files modified:** 7 code files, 1 summary file

## Accomplishments

- Added `kind` to chemical raw materials and accessory snapshots to chemical material requests.
- Extended serialized materials and requests with `kind` and `accessories`, defaulting old request documents to `accessories: []`.
- Added fixed accessory definitions for `shoppers`, `drums`, and `seals`, all using `pcs`.
- Updated request creation to accept optional accessory quantities, validate codes and quantities, and snapshot accessory stock rows.
- Updated Waleed approval to validate chemical and accessory stock together, return item-specific shortage messages, and deduct all requested lines.

## Task Commits

Each task was committed atomically:

1. **Task 1: Schema extension** - `9039732` (feat)
2. **Task 2: Serializers and helpers** - `0899e1f` (feat)
3. **Task 3: Stock validation and deduction** - `c082d40` (feat)
4. **Task 4: Request API** - `b269548` (feat)
5. **Task 5: Approval API** - `4202ff5` (feat)

**Plan metadata:** included in final docs commit.

## Files Created/Modified

- `lib/models/ChemicalRawMaterial.ts` - Adds the `kind` discriminator with default `chemical`.
- `lib/models/ChemicalMaterialRequest.ts` - Adds request accessory subdocuments with item snapshots.
- `lib/chemicalMaterials.ts` - Serializes `kind` and `accessories`, and defines supported accessory constants.
- `lib/chemicalStock.ts` - Adds combined shortage validation and all-line deduction with transaction fallback.
- `app/api/chemical-materials/route.ts` - Accepts material `kind`, defaulting to `chemical`.
- `app/api/chemical-material-requests/route.ts` - Parses and snapshots optional accessory request lines.
- `app/api/admin/chemical-material-requests/[id]/route.ts` - Uses combined validation and returns structured shortages.
- `.planning/phases/45-print-trip-accessory-stock/03-SUMMARY.md` - Execution summary.

## Decisions Made

- Reused `ChemicalRawMaterial` for accessory stock instead of creating a separate collection, matching the plan recommendation and existing stock tooling.
- Kept accessory codes fixed to `shoppers`, `drums`, and `seals` so request validation can reject unknown accessory inputs early.
- Required accessory rows to be cataloged as `kind: accessory` before request creation stores snapshots.
- Aggregated requested stock lines by code before validation and deduction to prevent duplicate entries from bypassing availability checks.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- `npm run build` compiled successfully but failed during TypeScript checking on unrelated untracked `scripts/generate-user-manual-docx.ts` because the `docx` package is not installed.
- Focused verification passed with `npx eslint` on all files modified by this plan.

## Verification

- Focused lint passed for all changed files.
- `npm run build` was attempted; it is still blocked by the pre-existing `docx` import issue outside this plan.
- Chemical-only requests remain valid because `accessories` is optional and serializes to `[]`.
- Accessory requests persist item snapshots through the request API when stock rows exist.
- Approval validation now checks chemical and accessory shortages and returns item-specific errors such as `Cannot approve - Drums stock is less. On hand: 0 pcs, requested: 2 pcs.`.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Backend support is ready for the Plan 04 UI work: Esha can create accessory stock rows through the material API, Ramazan can submit accessory quantities through the request API, and Waleed receives serialized accessory lines plus structured shortage payloads.
- Remaining concern: repository-wide `npm run build` remains blocked by the unrelated manual generation script until `docx` is installed or that script is excluded from type checking.

---
*Phase: 45-print-trip-accessory-stock*
*Completed: 2026-07-04*
