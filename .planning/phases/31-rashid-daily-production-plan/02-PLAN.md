---
wave: 2
depends_on: ["31-rashid-daily-production-plan/01-PLAN.md"]
gap_closure: false
files_modified:
  - "app/api/admin/production-employees/route.ts"
  - "app/api/admin/rashid-daily-plan/route.ts"
autonomous: true
---

<phase_goal>
Expose **admin-only APIs**: employee roster for dropdowns, and **GET/PUT daily plan** with automatic carry-in from the previous saved plan.
</phase_goal>

<must_haves>
- [ ] `GET /api/admin/production-employees` — `admin` role only; returns `{ employees: [{ id, name }] }`.
- [ ] `GET /api/admin/rashid-daily-plan?date=YYYY-MM-DD`:
  - Loads plan for date if exists.
  - Resolves `carryIn` per line from **previous calendar day’s** saved plan (`carryOut` for matching `lineKey`); if no prior plan, `carryIn = 0`.
  - Returns computed `effectiveTarget` / `carryOut` even before save (preview).
  - Returns `employees` list for dropdowns (or client fetches separately).
- [ ] `PUT /api/admin/rashid-daily-plan` — upsert for `planDate`:
  - Body: `date`, `helperEmployeeId`, `productionLines[]` (baseTarget, statusAchieved, label, lineKey), `duties` (three employee ids).
  - Validate employee ids exist; denormalize names.
  - Recompute `carryIn` from DB (do not trust client carryIn), then `effectiveTarget`, `carryOut`; persist.
  - `recordedByUserId` / `recordedByName` from session.
- [ ] Reject invalid dates; non-negative integers for targets/status.
- [ ] 403 for non-admin.
</must_haves>

<tasks>
  <task id="1" name="employees-api">
    <step>`GET /api/admin/production-employees` using `loadProductionEmployees()`.</step>
  </task>

  <task id="2" name="plan-get">
    <step>Implement GET with date query defaulting to today (factory timezone: use UTC date or `Asia/Karachi` — pick one, document in SUMMARY).</step>
    <step>Helper `buildPlanView(date, existingPlan, previousPlan)` in `lib/rashidDailyPlan.ts`.</step>
    <step>Serialize dates as ISO date strings.</step>
  </task>

  <task id="3" name="plan-put">
    <step>Upsert on `planDate`; merge default line `main` if array empty.</step>
    <step>Validate all three duty employee ids present (required on save).</step>
    <step>Return saved plan with computed fields.</step>
  </task>
</tasks>

<verification>
- PUT plan for 2026-06-22: base 1000, status 700 → carryOut 300 stored.
- GET plan for 2026-06-23 (no save yet): carryIn 300 on `main` line, effective 1300 if base 1000.
- Non-admin GET → 403.
- `npm run build` passes.
</verification>
