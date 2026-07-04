---
phase: 45-print-trip-accessory-stock
verified: 2026-07-04T08:11:45Z
status: human_needed
score: 9/9 structural must-haves verified
human_verification:
  - test: "Print timestamp via button"
    expected: "Print preview shows a current Printed day/date/time, and printing again later refreshes it."
    why_human: "Browser print preview output and timing are visual/runtime behavior."
  - test: "Browser print shortcut timestamp"
    expected: "Ctrl+P from a loading sheet refreshes the Printed timestamp before the preview opens."
    why_human: "Native beforeprint behavior depends on the browser print workflow."
  - test: "Authenticated role workflows"
    expected: "Ali can create/edit/discard dispatch trips; Rashid cannot but can assign batches, carton weights, filling, and ready stock; Esha/Ramazan/Waleed chemical accessory flows complete end to end."
    why_human: "Requires seeded users, live sessions, and database-backed workflow data."
test_results:
  - command: "npm run build"
    status: passed
    details: "Next.js 16.2.6 production build, TypeScript, page data collection, and static generation completed successfully."
---

# Phase 45: Print Trip Accessory Stock Verification Report

**Phase Goal:** Loading sheets should print the live day/time when printed. Ali is the only dispatch user allowed to create, edit, or discard vehicle trips; Rashid keeps batch/weight/filling work only. Esha tracks stock for shoppers, drums, and seals. Ramazan can optionally request those accessories alongside a chemical request, and Waleed approval is blocked when either chemical stock or requested accessory stock is below the requested requirement.
**Verified:** 2026-07-04T08:11:45Z
**Status:** human_needed
**Re-verification:** No - initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Printed loading sheet includes a current Printed day/date/time and updates from the print button. | STRUCTURAL / HUMAN VERIFY | `components/LoadingSheetBatchEditor.tsx` stores `printedAt`, formats weekday/date/time, renders a separate `Printed:` row, and passes `updatePrintedAt` to `components/PrintSheetButton.tsx`; the button invokes `onBeforePrint` before `window.print()`. |
| 2 | Browser/native print shortcut updates the Printed timestamp. | STRUCTURAL / HUMAN VERIFY | `components/LoadingSheetBatchEditor.tsx` registers a `beforeprint` listener that calls the same `updatePrintedAt` callback and cleans it up on unmount. |
| 3 | Existing order Date remains unchanged. | VERIFIED | `app/(app)/orders/[id]/loading-sheet/page.tsx` derives `createdDate` from `order.createdAt`; `components/LoadingSheetBatchEditor.tsx` renders that `Date:` field separately from the local, non-persisted `printedAt` state. |
| 4 | Ali (`username: ali`, role `dispatch_editor`) is the only non-admin user who can create, edit, or discard dispatch trips. | VERIFIED | `lib/roles.ts` makes trip planning username-aware through `isDispatchTripPlanner`; create/edit/discard helpers return true only for `ali` or admin. Dispatch trip POST/PATCH/DELETE APIs call those helpers with `user.username` and return Ali-specific 403 messages. |
| 5 | Rashid cannot create/edit/discard trips by UI or API, but can still assign batches, carton weights, and filling. | STRUCTURAL / HUMAN VERIFY | Trip list/new/detail pages hide or redirect trip planning controls when `canCreateDispatchTrips`/`canEditDispatchTrip` fail. API mutation routes reject non-Ali dispatch editors. `canAssignDispatchBatches`/`canEditDispatch` still support non-Ali dispatch editors, and orders/trip detail pages preserve assignment links for Rashid. |
| 6 | Esha can maintain shoppers, drums, and seals stock. | VERIFIED | `/production/chemical-intake` renders `AccessoryStockCard`; it lists fixed `CHEMICAL_ACCESSORIES` and creates/updates only accessory stock rows through `/api/chemical-materials`. The API permits `batch_editor`/admin for fixed accessories via `canEditChemicalAccessoryStock`. |
| 7 | Ramazan can optionally request shoppers, drums, and seals alongside a chemical request; accessory fields are not compulsory. | VERIFIED | `components/ChemicalMaterialsPortal.tsx` labels `Optional packing/accessories`, keeps fields blank by default, and submits only quantities greater than zero. `POST /api/chemical-material-requests` accepts missing `accessories` as an empty array and validates accessories only when provided. |
| 8 | Waleed approval checks chemical and requested accessory stock and blocks with clear error when any requested stock is short. | VERIFIED | `lib/chemicalStock.ts` aggregates the chemical plus accessory lines, validates current stock, formats item-specific `stock is less` errors, and deducts all lines only after validation. The admin approval route returns HTTP 400 with `shortages`; `components/AdminChemicalRequestsTable.tsx` shows red insufficient-stock copy and disables Approve for known shortages. |
| 9 | Build passes. | VERIFIED | `npm run build` completed successfully: production compile, TypeScript, page data, and static generation all passed. |

**Score:** 9/9 structural truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `components/LoadingSheetBatchEditor.tsx` | Printed timestamp state, display, and shortcut handling | VERIFIED | Substantive client implementation with formatter, `flushSync` state update, `beforeprint` listener, separate `Date:` and `Printed:` rows. |
| `components/PrintSheetButton.tsx` | Print callback before browser print | VERIFIED | Accepts `onBeforePrint` and calls it before `window.print()`. |
| `lib/roles.ts` | Username-aware dispatch trip and accessory permissions | VERIFIED | Adds Ali/admin trip planner helpers and Esha/admin accessory stock helper while preserving Rashid batch operator helpers. |
| `app/api/dispatch-trips/route.ts` | Ali/admin trip create API | VERIFIED | POST checks `canCreateDispatchTrips(role, username)` and returns `Only Ali can create dispatch trips.` for forbidden users. |
| `app/api/dispatch-trips/[id]/route.ts` | Ali/admin trip edit/discard API | VERIFIED | PATCH and DELETE check edit/discard helpers with username; DELETE clears linked order trip IDs and blocks inactive POs. |
| `app/(app)/dispatch/trips/page.tsx`, `new/page.tsx`, `[id]/page.tsx` | Trip UI guards | VERIFIED | New trip route redirects non-planners; detail renders editable form only for trip planners and keeps Rashid assignment links. |
| `components/DispatchTripForm.tsx` | Create/edit/discard trip UI | VERIFIED | Real POST/PATCH/DELETE handlers; UI wording says `Discard trip`. |
| `components/OrdersListWithTrips.tsx` | Split trip planning from batch assignment | VERIFIED | `canPlanTrips` controls trip selection/create; `canAssignBatches` controls Rashid assignment links. |
| `lib/models/ChemicalRawMaterial.ts` | Chemical/accessory stock model | VERIFIED | Adds `kind: chemical/accessory` with default `chemical`. |
| `lib/models/ChemicalMaterialRequest.ts` | Optional request accessories | VERIFIED | Adds `accessories[]` subdocuments with item code/name/quantity/unit/on-hand snapshot and default `[]`. |
| `lib/chemicalMaterials.ts` | Serializers and accessory constants | VERIFIED | Defines fixed shoppers/drums/seals constants, serializes material kind and request accessories. |
| `lib/chemicalStock.ts` | Approval validation and deduction | VERIFIED | Validates aggregated stock lines, returns structured shortages, and deducts chemical/accessory lines with transaction or rollback fallback. |
| `app/api/chemical-materials/route.ts`, `[code]/route.ts` | Esha accessory stock API | VERIFIED | Allows fixed accessory create/update for `batch_editor`/admin and rejects arbitrary accessory names. |
| `app/api/chemical-material-requests/route.ts` | Ramazan optional accessory request API | VERIFIED | Missing accessories are allowed; provided accessories must be known, positive, and backed by active accessory stock rows. |
| `app/api/admin/chemical-material-requests/[id]/route.ts` | Waleed approval guard | VERIFIED | Validates stock before approval, returns shortages on failure, reverts request to pending if deduction fails. |
| `app/(app)/production/chemical-intake/page.tsx`, `components/ChemicalIntakeForm.tsx` | Esha accessory stock UI | VERIFIED | Dedicated accessory card on Esha's intake page for Shoppers, Drums, Seals. |
| `components/ChemicalMaterialsPortal.tsx` | Ramazan request UI | VERIFIED | Optional accessory section in request modal and recent-request accessory summaries. |
| `components/AdminChemicalRequestsTable.tsx` | Waleed shortage UI | VERIFIED | Shows requested accessories/current stock, item-specific shortage text, and disables approval while short. |

### Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| Print button | Loading sheet DOM | `onBeforePrint` -> `updatePrintedAt` -> `window.print()` | WIRED | Timestamp state is flushed before print preview opens. |
| Browser print shortcut | Loading sheet DOM | `window.beforeprint` listener | WIRED | Same timestamp update callback is used for native/browser print. |
| Loading sheet date | Order created date | `createdDate` prop from `order.createdAt` | WIRED | Order date is read-only display and not reused for print metadata. |
| Trip UI | Trip mutation APIs | `DispatchTripForm` POST/PATCH/DELETE | WIRED | Form handlers call `/api/dispatch-trips` and `/api/dispatch-trips/[id]`. |
| Trip APIs | Authorization helpers | `canCreateDispatchTrips`, `canEditDispatchTrip`, `canDiscardDispatchTrip` with `username` | WIRED | Direct API mutation calls from Rashid/non-Ali dispatch editors return 403. |
| Orders/trip detail UI | Rashid batch assignment | `canAssignDispatchBatches` -> loading sheet `?dispatch=1` links | WIRED | Rashid assignment route remains visible where allowed. |
| Esha accessory UI | Material stock APIs | `AccessoryStockCard` POST/PATCH `/api/chemical-materials` | WIRED | Creates missing fixed accessory rows or updates existing stock. |
| Ramazan request UI | Request API | `ChemicalMaterialsPortal` POST `/api/chemical-material-requests` | WIRED | Sends `accessories` only for positive optional quantities. |
| Waleed approval UI | Approval API | `AdminChemicalRequestsTable` PATCH `/api/admin/chemical-material-requests/[id]` | WIRED | UI pre-checks stock; API is source of truth for approval blocking. |
| Approval API | Stock ledger | `deductForApprovedRequest` and movement logging | WIRED | Chemical/accessory stock lines are conditionally deducted and logged. |

### Requirements Coverage

| Requirement | Status | Blocking Issue |
| --- | --- | --- |
| Phase 45 roadmap goal | STRUCTURALLY SATISFIED | None found. Human workflow checks remain for browser print preview and authenticated role flows. |
| Dedicated Phase 45 entries in `REQUIREMENTS.md` | N/A | No Phase 45-specific requirements were found in `REQUIREMENTS.md`; verification used the roadmap goal and user-supplied must-haves. |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| --- | --- | --- | --- | --- |
| `components/LoadingSheetBatchEditor.tsx` | N/A | Normal input `placeholder` attributes | Info | Not a stub. |
| `components/ChemicalIntakeForm.tsx` | N/A | Normal input `placeholder` attributes | Info | Not a stub. |
| `components/ChemicalMaterialsPortal.tsx` | N/A | Normal input `placeholder` attributes | Info | Not a stub. |
| `lib/chemicalMaterials.ts`, `components/AdminChemicalRequestsTable.tsx` | N/A | Guard clauses returning `null` | Info | Normal parsing/filtering logic, not empty implementation. |

### Human Verification Required

### 1. Print Timestamp Via Button

**Test:** Open any loading sheet, click **Print loading sheet**, close print preview, wait at least one minute, and print again.
**Expected:** The printed output shows `Printed:` with current day/date/time, and the second preview shows the later time. The existing `Date:` remains the order date.
**Why human:** Browser print preview and final printed layout are visual/runtime behavior.

### 2. Browser Print Shortcut

**Test:** Open any loading sheet and press Ctrl+P.
**Expected:** Print preview shows a refreshed `Printed:` timestamp.
**Why human:** Native `beforeprint` timing can vary by browser and must be checked in the actual user browser.

### 3. Authenticated Role Workflows

**Test:** Log in with seeded Ali, Rashid, Esha, Ramazan, and Waleed users and run the core workflows.
**Expected:** Ali can create/edit/discard trips; Rashid cannot trip-plan but can assign batches/carton weights/filling; Esha can save Shoppers/Drums/Seals stock; Ramazan can request chemical-only or chemical-plus-accessories; Waleed is blocked on any chemical/accessory shortage and can approve once all stock is enough.
**Why human:** Requires database state, seeded users, and end-to-end session behavior.

### Test / Build Results

| Command | Status | Evidence |
| --- | --- | --- |
| `npm run build` | PASSED | Next.js 16.2.6 compiled successfully, TypeScript completed, 63 static pages generated, and route optimization finished. |

### Gaps Summary

No automated code gaps were found. The phase is structurally implemented and the build passes. Status is `human_needed` only because print preview timing and authenticated multi-role workflows need to be exercised in the browser with real sessions and database records.

---

_Verified: 2026-07-04T08:11:45Z_
_Verifier: Claude (gsd-verifier)_
