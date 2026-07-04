# Project State

Phase **45 in progress** — print timestamp, Ali trip control, and chemical accessories

## Current position
- **Phase:** 45 of 45 (`45-print-trip-accessory-stock`)
- **Plan:** 03 of 04 complete
- **Status:** In progress
- **Last activity:** 2026-07-04 — Completed `03-PLAN.md`
- **Progress:** Phase 45 `███░` 3/4 plans complete

## Last completed
- **Phase 45 Plan 03** — Chemical request accessory stock data model, request API snapshots, and combined Waleed approval shortage guard
- **Phase 45 Plan 02** — Ali/admin-only dispatch trip create/edit/discard, with Rashid preserved for batch assignment and loading sheet work
- **Phase 45 Plan 01** — Real printed-at timestamp on loading sheets, updated on print button clicks and browser print shortcuts
- **Phase 44** — Esha `/production/chemical-intake` (upsert catalog by name), Ramazan read-only stock, Waleed approve with shortage guard + stock movement ledger

## Next planned
- **Phase 45 Plan 04** — Esha accessory stock UI, Ramazan optional accessory request UI, and Waleed accessory shortage display
- Remaining phase scope: expose accessory inputs and shortage details in the UI

## Decisions
- Print timestamp is local client metadata only and is not persisted to order data.
- Loading sheet order `Date:` remains the original `createdDate`; print time is shown separately as `Printed:`.
- Print button timestamp updates are flushed before `window.print()` so print preview sees the current click time.
- Admin remains allowed to create, edit, and discard dispatch trips; Ali is the only non-admin trip planner.
- Dispatch trip discard is blocked once any linked PO is no longer active for Rashid's factory queue.
- Accessory stock reuses `ChemicalRawMaterial` with `kind: chemical | accessory` instead of a separate collection.
- Supported accessory request codes are fixed to `shoppers`, `drums`, and `seals`, each using `pcs`.
- Accessory request snapshots require existing `kind: accessory` stock rows before request creation.
- Approval validation aggregates chemical and accessory stock lines by code before conditional deduction.

## Concerns / blockers
- `npm run build` is currently blocked by unrelated untracked `scripts/generate-user-manual-docx.ts` importing missing `docx`.
- `npm run lint` currently fails on pre-existing repository-wide React hook and TypeScript lint issues outside the plan 02 touched files.

## Session continuity
- **Last session:** 2026-07-04T07:55:48Z
- **Stopped at:** Completed `03-PLAN.md`
- **Resume file:** None
