---
wave: 3
depends_on: ["17-rashid-daily-filling-waste/02-PLAN.md"]
gap_closure: false
files_modified:
  - "app/(app)/admin/page.tsx"
  - "app/api/admin/summary/route.ts"
  - ".planning/ROADMAP.md"
autonomous: true
---

<phase_goal>
**Waleed (admin)** can review batch waste/variance alongside existing oversight; document **Phase 18** packaging auto-deduct (deferred).
</phase_goal>

<must_haves>
- [ ] Admin can open `/dispatch/filling` read-only (from plan 02) OR small “Waste today” summary on admin dashboard (batches with |variance| &gt; 0).
- [ ] ROADMAP: Phase 18 = packaging auto-deduct (moved from old Phase 17).
- [ ] In-app help text on filling page explaining Nimra vs Rashid columns and that formula may be tuned after UAT.
</must_haves>

<tasks>
  <task id="1" name="admin-visibility">
    <step>Optional: add admin summary card listing top N batches by variance today (reuse GET batch-filling).</step>
    <step>Ensure admin nav includes Daily filling link (read-only).</step>
  </task>

  <task id="2" name="roadmap-phase-18">
    <step>Update ROADMAP.md: Phase 17 = this phase ✓ when done; Phase 18 = packaging auto-deduct.</step>
  </task>
</tasks>

<verification>
- Admin sees variance column and cannot edit.
- Build passes.
</verification>
