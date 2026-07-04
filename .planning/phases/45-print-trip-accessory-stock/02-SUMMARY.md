---
phase: 45-print-trip-accessory-stock
plan: 02
subsystem: dispatch
tags: [nextjs, authorization, dispatch-trips, roles, ui-guards]

# Dependency graph
requires:
  - phase: 44
    provides: dispatch trip, loading sheet, and Rashid assignment workflows
provides:
  - Ali/admin-only dispatch trip create, edit, and discard permissions
  - Username-aware API authorization for dispatch trip mutations
  - Rashid-safe UI guards that preserve batch assignment and loading sheet access
  - Discard wording and active-factory safety checks for trip removal
affects:
  - 45-print-trip-accessory-stock/03-PLAN.md
  - dispatch trip planning
  - loading sheet assignment

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Username-aware role helpers for dispatch trip mutations
    - Separate trip-planning controls from batch-assignment controls in shared UI

key-files:
  created:
    - .planning/phases/45-print-trip-accessory-stock/02-SUMMARY.md
  modified:
    - lib/roles.ts
    - app/api/dispatch-trips/route.ts
    - app/api/dispatch-trips/[id]/route.ts
    - app/(app)/dispatch/trips/page.tsx
    - app/(app)/orders/page.tsx
    - components/OrdersListWithTrips.tsx
    - components/DispatchTripForm.tsx

key-decisions:
  - "Admin remains allowed to create, edit, and discard trips; Ali is the only non-admin trip planner."
  - "Discard is blocked once any linked PO is no longer active for Rashid's factory queue."

patterns-established:
  - "Trip planning permission is checked with canCreateDispatchTrips, canEditDispatchTrip, and canDiscardDispatchTrip using both role and username."
  - "Shared dispatch UI passes separate booleans for trip planning and batch assignment instead of treating every dispatch_editor the same."

# Metrics
duration: 4 min 20 sec
completed: 2026-07-04
---

# Phase 45 Plan 02: Ali-Only Trip Control Summary

**Ali/admin-only dispatch trip mutation flow with Rashid preserved for batch assignment and loading sheet work.**

## Performance

- **Duration:** 4 min 20 sec
- **Started:** 2026-07-04T07:44:49Z
- **Completed:** 2026-07-04T07:49:09Z
- **Tasks:** 4
- **Files modified:** 7 code files, 1 summary file

## Accomplishments

- Tightened dispatch trip helpers so create, edit, and discard are restricted to Ali/admin while Rashid's assignment helpers remain unchanged.
- Updated POST, PATCH, and DELETE dispatch trip APIs to use username-aware permissions with clear 403 messages for Rashid/direct calls.
- Hid trip creation, PO selection, edit, and discard controls from Rashid while keeping his loading sheet, assign batches, and carton-weight paths intact.
- Renamed the UI action to `Discard trip` and blocked discard when linked POs have already left the active factory queue.

## Task Commits

Each task was committed atomically:

1. **Task 1: Role helpers** - `7edb33c` (feat)
2. **Task 2: API authorization** - `73fad97` (feat)
3. **Task 3: Trip UI guards** - `867c5a6` (feat)
4. **Task 4: Discard trip behavior** - `6797b9a` (feat)

**Plan metadata:** included in final docs commit.

## Files Created/Modified

- `lib/roles.ts` - Added discard helper and tightened trip create/edit helpers around Ali/admin planner permission.
- `app/api/dispatch-trips/route.ts` - POST now uses `canCreateDispatchTrips(role, username)`.
- `app/api/dispatch-trips/[id]/route.ts` - PATCH and DELETE now use edit/discard helpers; DELETE blocks inactive linked POs.
- `app/(app)/dispatch/trips/page.tsx` - Trip list messaging now uses the tightened edit helper.
- `app/(app)/orders/page.tsx` - Passes separate trip-planning and batch-assignment permissions to the orders list.
- `components/OrdersListWithTrips.tsx` - Hides PO selection and create-trip controls unless trip planning is allowed.
- `components/DispatchTripForm.tsx` - Renamed delete flow to discard and updated confirm/error copy.
- `.planning/phases/45-print-trip-accessory-stock/02-SUMMARY.md` - Execution summary.

## Decisions Made

- Admin remains part of the trip planner permission because the phase goal says Ali is the only non-admin user who can create, edit, or discard trips.
- Discard is allowed only while every linked PO is still active for Rashid's factory queue (`none` or `pending_redelivery`), preventing removal of out-for-delivery or delivered history.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Split orders-list trip planning from batch assignment**
- **Found during:** Task 3 (Trip UI guards)
- **Issue:** `components/OrdersListWithTrips.tsx` treated any `dispatch_editor` as eligible for PO selection and the `Create trip with selected` link, so Rashid still had a UI path into trip creation from `/orders`.
- **Fix:** Added separate `canPlanTrips` and `canAssignBatches` props, passed Ali/admin trip-planning permission from `app/(app)/orders/page.tsx`, and left Rashid assignment controls intact.
- **Files modified:** `app/(app)/orders/page.tsx`, `components/OrdersListWithTrips.tsx`
- **Verification:** Focused ESLint on all plan-touched files passed.
- **Committed in:** `867c5a6`

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Required to satisfy "create/edit/discard trip controls hidden" for Rashid across the actual UI entry points. No scope creep beyond trip control authorization.

## Issues Encountered

- `npm run lint` fails on pre-existing repository-wide issues outside this plan, including React hook lint errors in unrelated components and `no-explicit-any` in `lib/auth.ts`. The focused ESLint command for plan-touched files passed.
- `npm run build` compiled successfully but failed type checking on unrelated untracked `scripts/generate-user-manual-docx.ts` because the `docx` module is not installed. This matches the blocker already recorded in `STATE.md`.

## Verification

- `npx eslint lib/roles.ts app/api/dispatch-trips/route.ts "app/api/dispatch-trips/[id]/route.ts" "app/(app)/dispatch/trips/page.tsx" "app/(app)/dispatch/trips/[id]/page.tsx" "app/(app)/dispatch/trips/new/page.tsx" "app/(app)/orders/page.tsx" components/DispatchTripForm.tsx components/OrdersListWithTrips.tsx` - passed.
- `npm run lint` - failed on unrelated pre-existing issues outside plan-touched files.
- `npm run build` - failed on unrelated missing `docx` dependency in `scripts/generate-user-manual-docx.ts` after successful compile.
- Manual login/API verification was not run in this execution environment.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 03 can proceed with chemical/accessory stock model and API work.
- Remaining blocker: full build still requires resolving or excluding the unrelated user-manual DOCX script dependency.

---
*Phase: 45-print-trip-accessory-stock*
*Completed: 2026-07-04*
