# Phase 06 UAT — Dispatch assignment (Rashid)

**Status:** paused  
**Started:** 2026-05-13  
**Phase:** 06 — Dispatch / Delivery Assignment

## Tests

| # | Test | Expected | Result | Notes |
|---|------|----------|--------|-------|
| 1 | Rashid login | `rashid` / `Rashid-Dispatch-01` logs in at `/login` and lands on `/orders` | pass | |
| 2 | Orders list — Rashid actions | Each order row has **View loading sheet** and **Edit dispatch**; nav has **Orders** only (no **New order**) | pending | UAT paused — stakeholder pivoted to Phase 07 planning |
| 3 | Edit dispatch — header fields | On `?dispatch=1`, Rashid can type Vehicle No, Driver Name, DC No, Helper Name; Date stays read-only | pending | |
| 4 | Edit dispatch — footer fields | Production Incharge, Security, and Driver (footer) are editable in dispatch mode | pending | |
| 5 | Save dispatch | **Save dispatch** persists values; view mode shows filled header/footer (not empty dotted lines) | pending | |
| 6 | Print shows dispatch | Print preview includes saved Vehicle, Driver, DC, Helper, and footer values | pending | |
| 7 | Rashid — batches read-only | Batch column and batch liters panel are not editable for Rashid | pending | |
| 8 | PO creator view | Nouman (or any PO user) sees saved dispatch on sheet; no **Edit dispatch** button | pending | |
| 9 | Route guard | Rashid visiting `/new-order` is redirected to `/orders` | pending | |

## Summary

- **Passed:** 1
- **Failed:** 0
- **Pending:** 8
