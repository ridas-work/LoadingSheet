---
wave: 3
depends_on:
  - "53-market-visit-no-alerts/02-PLAN.md"
  - "53-market-visit-no-alerts/03-PLAN.md"
files_modified:
  - .planning/phases/53-market-visit-no-alerts/53-VERIFICATION.md
autonomous: true
---

# Plan 04 — Verification and regression

## Objective

Confirm alert lifecycle end-to-end and no regression on Phase 50 market visits or sales field visits.

## Tasks

<task id="04-1">
Manual UAT script (document in `53-VERIFICATION.md`):
1. Aslam: new market visit, store **Al Fatah / Lahore**, **Ocean = N** → red, save draft
2. New market visit, same store → Ocean cell red before entry
3. Mark **Ocean = Y**, save → red gone; DB alert resolved
4. Leave **Lemon = N** from step 1 (if separate visit) → still red on next visit
5. Nouman sales visit unchanged (no alert API, no red cells)
</task>

<task id="04-2">
Run `npm run build` and spot-check admin field visits list still loads market tickets.
</task>

## Verification

- [ ] `53-VERIFICATION.md` checklist complete
- [ ] `npm run build` passes

## must_haves

- Phase 50 market form still submits and prints
- Sales field visits (Nouman/Javeria) unchanged
