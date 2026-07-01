---
wave: 1
depends_on: []
gap_closure: false
files_modified:
  - "lib/roles.ts"
  - "app/api/dispatch/daily-plan/route.ts"
  - "lib/rashidDailyPlan.ts"
autonomous: true
---

<phase_goal>
Expose Rashid daily plan **read + end-of-day PATCH** on dispatch-scoped API routes. Morning plan remains **admin-only** (Waleed PUT unchanged).
</phase_goal>

<must_haves>
- [ ] `canViewRashidDailyPlan(role, username)` — `isDispatchBatchOperator` OR `isAdmin`
- [ ] `canRecordRashidDailyPlanStatus(role, username)` — same as view (Rashid closes the day)
- [ ] `canEditRashidMorningPlan(role)` — `isAdmin` only (document; used by existing admin routes)
- [ ] `GET /api/dispatch/daily-plan?date=YYYY-MM-DD` — returns `{ plan, saved }` via `buildPlanView` (same shape as admin GET)
- [ ] `GET /api/dispatch/daily-plan?list=1` — last **14** plans: `planDate`, `helperName`, `dayStatus`, `rowCount` (Rashid queue)
- [ ] `PATCH /api/dispatch/daily-plan` — body `{ date, statusRows: [{ lineKey, statusAchieved }] }`; reuse `applyStatusUpdates`; set `dayStatus: closed`
- [ ] All dispatch routes return **401/403** for po_creator, gate_guard, Ali trip planner, etc.
- [ ] **No PUT** on dispatch route (Rashid cannot create morning plan)
- [ ] PATCH rejected if no morning plan saved for date
- [ ] `syncProductionEmployeesFromDisk()` before plan read if employee names needed (optional; keep consistent with admin)
</must_haves>

<tasks>
  <task id="1" name="roles">
    <step>Add helpers to `lib/roles.ts` per research.</step>
    <step>Export for use in API routes and page guards.</step>
  </task>

  <task id="2" name="dispatch-api">
    <step>Create `app/api/dispatch/daily-plan/route.ts`.</step>
    <step>GET: auth + `canViewRashidDailyPlan`; connect DB; `findPlanByIsoDate`; `buildPlanView` with previous day for carry-in display.</step>
    <step>GET list=1: sort `planDate` desc, limit 14, map via `serializePlanListItem`.</step>
    <step>PATCH: auth + `canRecordRashidDailyPlanStatus`; require existing plan; parse `statusRows`; `applyStatusUpdates`; save `dayStatus closed`, `statusRecordedAt`, `statusRecordedByName` from session.</step>
    <step>Share date-range helper with admin route (extract `dayRange` / `findPlanByIsoDate` to `lib/rashidDailyPlan.ts` or small `lib/rashidDailyPlanDb.ts` if duplication annoys — minimal diff preferred).</step>
  </task>

  <task id="3" name="admin-guard-audit">
    <step>Confirm admin PUT/PATCH still `isAdmin` only — no regression.</step>
    <step>Smoke: `curl` or manual — Rashid session GET dispatch returns 200 when plan exists.</step>
  </task>
</tasks>

<verification>
- Rashid user GET `/api/dispatch/daily-plan?date=today` returns plan after Waleed saved morning plan.
- Rashid PATCH closes day; subsequent GET shows `dayStatus: closed` and non-zero `carryOut` where status &lt; effective.
- Non-Rashid dispatch_editor (Ali) gets 403 on dispatch daily-plan routes.
- `npm run build` passes.
</verification>
