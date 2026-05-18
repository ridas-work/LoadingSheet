# Project State

Phase: **17 planned** — Rashid daily filling & waste
Status: Plans ready — execute when approved

## Context
- **Phase 16 ✓** — `/dispatch/inventory` packaging spreadsheet (Purchased / Rejected / UIP / Balance).
- **Phase 17 (new)** — Rashid records daily **fill**, **ready to deliver**, **physical remaining** per Nimra batch; compare to **system remaining liters** for waste/variance.
- **Phase 18** — packaging auto-deduct (deferred from old Phase 17).

## Decisions (Phase 17 planning)
- Waste v1: `varianceLiters = systemRemaining − physicalRemaining` (validate with ops at UAT).
- UI: single inline table at `/dispatch/filling` (no separate edit page), same pattern as packaging inventory.
- One `BatchFillingDailyEntry` per batch per calendar date.

## Next
- **Execute:** `/gsd-execute-phase 17`
- **Discuss first:** `/gsd-discuss-phase 17` if waste formula needs stakeholder sign-off
