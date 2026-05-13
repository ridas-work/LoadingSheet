# Project State

Phase: **05 planned** — batch volume & weight validation
Status: Ready to execute Phase 05 (`/gsd-execute-phase 5`)

## Context
- Loading Sheet app: Next.js + MongoDB Atlas + NextAuth (credentials)
- Nimra assigns batch numbers on loading sheet edit mode (Phase 04).

## Decisions Made
- **Batch** = production lot with **total liters** (e.g. 1000 L).
- **Row consumption** = `bottlesPerBox × litersPerBottle` (one row = one carton).
- **Weight column** on print = liters per carton (auto-calculated).
- **Batch total / remaining** = screen-only for Nimra (not printed on paper).
- Dispatch moved to **Phase 06**.

## Next
- **Execute Phase 05:** `/gsd-execute-phase 5`
- **Phase 06:** Dispatch
