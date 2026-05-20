---
wave: 3
depends_on: ["18-admin-order-edit/02-PLAN.md"]
gap_closure: false
files_modified:
  - "README.md"
  - ".planning/ROADMAP.md"
autonomous: true
---

<phase_goal>
Document boss-only order correction workflow; Phase 19 stub for packaging auto-deduct.
</phase_goal>

<must_haves>
- [ ] README: only Waleed can edit orders; PO team creates, boss corrects.
- [ ] Admin dashboard oversight card mentions Edit order.
- [ ] ROADMAP: Phase 18 ✓ when done; Phase 19 = packaging auto-deduct.
</must_haves>

<tasks>
  <task id="1" name="docs-roadmap">
    <step>README workflow section for admin order edit.</step>
    <step>Admin page link text if needed.</step>
    <step>ROADMAP Phase 19 for auto-deduct (renumber from old 18).</step>
  </task>
</tasks>

<verification>
- Docs accurate; build passes.
</verification>
