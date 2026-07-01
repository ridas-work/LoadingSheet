---
wave: 3
depends_on: ["31-rashid-daily-production-plan/02-PLAN.md"]
gap_closure: false
files_modified:
  - "app/(app)/admin/rashid-daily-plan/page.tsx"
  - "components/RashidDailyPlanForm.tsx"
  - "app/(app)/layout.tsx"
  - "components/AdminSummaryDashboard.tsx"
  - "README.md"
  - "data/production-employees.json"
autonomous: true
---

<phase_goal>
**Waleed** gets `/admin/rashid-daily-plan`: date picker, helper dropdown, target/status/carry display, and three duty dropdowns (box making, machine cleaning, hall organization).
</phase_goal>

<must_haves>
- [ ] `/admin/rashid-daily-plan` — server page: `admin` only (redirect others).
- [ ] `RashidDailyPlanForm.tsx` client form:
  - **Date** input — on change, GET plan for that date.
  - **Helper of the day** — `<select>` from employees API.
  - **Production block** (v1 single row):
    - Base target (editable)
    - Carry in from yesterday (read-only, with note “from previous day”)
    - Effective target (read-only)
    - Status achieved (editable)
    - Carry to next day (read-only, highlighted)
  - **Duties** — three labeled dropdowns:
    1. Box making  
    2. Machine cleaning  
    3. Hall organization  
  - **Save** button → PUT; inline errors; success message.
- [ ] Admin nav: link **Rashid daily plan** in header (Waleed admin block) + quick link on `/admin` dashboard.
- [ ] README section: carry math example (1000 target, 700 status, 300 carry); how to update `data/production-employees.json` when names arrive.
- [ ] Replace placeholder employee names when user supplies list (edit JSON + redeploy).
</must_haves>

<tasks>
  <task id="1" name="form-ui">
    <step>Build `RashidDailyPlanForm` matching existing admin card styles (`ui.appCard`, `btn-primary`).</step>
    <step>Show carry-out in amber when &gt; 0 so Waleed sees unfinished work rolling forward.</step>
    <step>Disable save while submitting; refetch after save.</step>
  </task>

  <task id="2" name="admin-routes-nav">
    <step>`app/(app)/admin/rashid-daily-plan/page.tsx` — title “Rashid daily plan”, subtitle explaining carry-forward.</step>
    <step>Add nav link in `layout.tsx` admin section only.</step>
    <step>Add quick link row on `AdminSummaryDashboard` next to Field visits / Delivery summary.</step>
  </task>

  <task id="3" name="docs-employees">
    <step>README: Waleed workflow + employee JSON update instructions.</step>
    <step>When user provides employee names, update `production-employees.json` (stable `id` slugs from name).</step>
  </task>
</tasks>

<verification>
- Login as Waleed → **Rashid daily plan** in nav → form loads today.
- Set helper, base 1000, status 700 → carry shows 300 → Save → reload persists.
- Next calendar day → carry in shows 300, effective 1300 (if base still 1000).
- All three duty dropdowns required on save.
- `npm run build` passes; PM2 restart.
</verification>

## PLANNING COMPLETE
