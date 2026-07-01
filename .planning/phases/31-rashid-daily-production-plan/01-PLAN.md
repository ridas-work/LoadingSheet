---
wave: 1
depends_on: []
gap_closure: false
files_modified:
  - "data/production-employees.json"
  - "lib/models/RashidDailyPlan.ts"
  - "lib/rashidDailyPlan.ts"
autonomous: true
---

<phase_goal>
Add **employee roster seed**, **RashidDailyPlan** Mongo model, and **carry-forward math** (target + carry-in → effective target; status → carry-out for next day).
</phase_goal>

<must_haves>
- [ ] `data/production-employees.json` — array `{ id, name }`; seed with placeholder entries; document that Waleed will supply real names before go-live.
- [ ] `lib/rashidDailyPlan.ts`:
  - `parsePlanDate(isoDate)` → start-of-day Date
  - `previousCalendarDate(date)` 
  - `computeLineMetrics({ baseTarget, carryIn, statusAchieved })` → `{ effectiveTarget, carryOut }`
  - `carryInForLine(previousPlan, lineKey)` → number (0 if no prior)
- [ ] `RashidDailyPlan` schema:
  - `planDate` (required, unique)
  - `helperEmployeeId`, `helperName`
  - `productionLines[]`: `lineKey`, `label`, `baseTarget`, `carryIn`, `statusAchieved`, `effectiveTarget`, `carryOut` (store computed fields on save for audit)
  - `duties`: `boxMaking`, `machineCleaning`, `hallOrganization` each `{ employeeId, employeeName }`
  - `recordedByUserId`, `recordedByName`
- [ ] Index: unique on `planDate`.
- [ ] Default v1: one production line `lineKey: "main"`, `label: "Production target"`.
</must_haves>

<tasks>
  <task id="1" name="employee-roster">
    <step>Create `data/production-employees.json` with 3–5 placeholder names (or empty with README note).</step>
    <step>Add `lib/productionEmployees.ts` — `loadProductionEmployees()` reads JSON; `employeeById(id)`.</step>
  </task>

  <task id="2" name="carry-math">
    <step>Implement `lib/rashidDailyPlan.ts` with pure functions and unit-testable examples in verification comments.</step>
    <step>Example: base 1000, carryIn 0, status 700 → effective 1000, carryOut 300.</step>
    <step>Example: base 1000, carryIn 300, status 700 → effective 1300, carryOut 600.</step>
  </task>

  <task id="3" name="mongoose-model">
    <step>Create `lib/models/RashidDailyPlan.ts` matching research schema.</step>
    <step>Export TypeScript doc type for API serialization.</step>
  </task>
</tasks>

<verification>
- `computeLineMetrics(1000, 0, 700)` → effective 1000, carryOut 300.
- `computeLineMetrics(1000, 300, 700)` → effective 1300, carryOut 600.
- `npm run build` passes.
</verification>
