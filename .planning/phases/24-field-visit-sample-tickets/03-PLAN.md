---
wave: 3
depends_on: ["24-field-visit-sample-tickets/02-PLAN.md"]
gap_closure: false
files_modified:
  - "app/(app)/admin/page.tsx"
  - "app/(app)/admin/field-visits/page.tsx"
  - "README.md"
  - ".planning/STATE.md"
autonomous: true
---

<phase_goal>
Management can see all field visits and rep score totals; documentation explains the sales visit workflow.
</phase_goal>

<must_haves>
- [ ] **Admin read-only** list of all visit tickets with rep name, status, points, linked PO.
- [ ] **Leaderboard or summary** on admin: points per rep (Nouman, Javeria, others if added later) for current month.
- [ ] README workflow section for field visits and scoring.
</must_haves>

<tasks>
  <task id="1" name="admin-views">
    <step>Add `/admin/field-visits` or section on admin dashboard linking to full ticket table (read-only API using admin role).</step>
    <step>Extend field-visits GET to allow admin with `?scope=all`.</step>
  </task>

  <task id="2" name="docs">
    <step>Update README and STATE for Phase 24.</step>
  </task>
</tasks>

<verification>
- Admin can view all tickets and rep scores without edit actions.
- README describes sample → deliver → conclude → order outcome flow.
</verification>
