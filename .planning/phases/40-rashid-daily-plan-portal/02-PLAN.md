---
wave: 2
depends_on: ["01"]
gap_closure: false
files_modified:
  - "app/(app)/dispatch/daily-plan/page.tsx"
  - "app/(app)/dispatch/daily-plan/[date]/page.tsx"
  - "app/(app)/dispatch/daily-plan/[date]/status/page.tsx"
  - "components/RashidDailyPlanStatusForm.tsx"
  - "components/RashidDailyPlanDispatchList.tsx"
  - "app/(app)/layout.tsx"
autonomous: true
---

<phase_goal>
Rashid gets **Daily plan** in nav and pages to **view today’s targets** and **record end-of-day status** — without access to Waleed’s morning-plan editor.
</phase_goal>

<must_haves>
- [ ] Nav: `Daily plan` → `/dispatch/daily-plan` for `isDispatchBatchOperator` only (not Ali trip planner)
- [ ] `/dispatch/daily-plan` — shows **today’s date**; if plan `planned` → CTA “Record end-of-day status”; if `closed` → badge + view link; if no plan → “Waiting for Waleed to save today’s morning plan”
- [ ] Recent plans table (last 14) with date, helper(s), status, Open / Record status links
- [ ] `/dispatch/daily-plan/[date]` — **read-only** plan: helpers, work rows with **Target, Carry in, Effective**; end-of-day duty names; **no** Edit morning plan button for Rashid
- [ ] `/dispatch/daily-plan/[date]/status` — status entry table (name, duty, effective, status achieved, carry forward)
- [ ] `RashidDailyPlanStatusForm` accepts props:
  - `apiBase="/api/dispatch/daily-plan"`
  - `redirectBase="/dispatch/daily-plan"`
  - `showAdminLinks={false}` (hide “Create morning plan” admin link)
- [ ] Page guards: redirect non-Rashid users to `homePathForRole`
- [ ] Use `ui.cardVisible` on forms with inputs (overflow fix from recent work)
</must_haves>

<tasks>
  <task id="1" name="refactor-status-form">
    <step>Parameterize `RashidDailyPlanStatusForm` API URL and redirect paths.</step>
    <step>Admin status page passes `apiBase="/api/admin/rashid-daily-plan"`, `redirectBase="/admin/rashid-daily-plan"`.</step>
  </task>

  <task id="2" name="dispatch-pages">
    <step>Create `RashidDailyPlanDispatchList` (client) — fetch `GET /api/dispatch/daily-plan?list=1` + today fetch.</step>
    <step>`dispatch/daily-plan/page.tsx` — server shell + list component.</step>
    <step>`dispatch/daily-plan/[date]/page.tsx` — read-only view component (fork from `RashidDailyPlanView` or add `mode="dispatch"` prop to hide admin edit links).</step>
    <step>`dispatch/daily-plan/[date]/status/page.tsx` — wraps refactored status form.</step>
  </task>

  <task id="3" name="nav">
    <step>Add nav link in `layout.tsx` inside `batchOperator` block (after Daily filling or before).</step>
  </task>
</tasks>

<verification>
- Log in as Rashid → nav shows **Daily plan**.
- After Waleed saves today’s plan → Rashid list shows **Planned** + link to record status.
- Status save redirects to `/dispatch/daily-plan/[date]` with closed badge.
- Rashid does not see “Edit morning plan” or `/admin/rashid-daily-plan` links.
- `npm run build` && `pm2 restart loadingsheet`.
</verification>
