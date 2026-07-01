# Phase 31 Verification — Waleed Rashid daily production plan

Status: **passed**

| Must-have | Result |
|-----------|--------|
| Employee roster JSON | ✅ `data/production-employees.json` (11 names) |
| Template rows from Word | ✅ `data/rashid-daily-plan-template.json` |
| Carry math (1000/700→300) | ✅ `computeLineMetrics` in `lib/rashidDailyPlan.ts` |
| Mongo model `RashidDailyPlan` | ✅ unique `planDate` |
| Admin APIs | ✅ production-employees + rashid-daily-plan GET/PUT |
| Waleed UI | ✅ `/admin/rashid-daily-plan` |
| Helper dropdown | ✅ |
| Work table: Name, Duty, Target, Status, Carry | ✅ + carry-in / effective |
| End duties multi-assign | ✅ box making, machine cleaning, hall organization |
| Admin nav | ✅ |
| `npm run build` | ✅ |

## Notes

- Dates stored as UTC midnight (factory local calendar day as YYYY-MM-DD).
- Carry-in matches previous day by `lineKey` = `employeeId::duty-slug`.
- Rashid daily filling (`/dispatch/filling`) unchanged — separate workflow.
