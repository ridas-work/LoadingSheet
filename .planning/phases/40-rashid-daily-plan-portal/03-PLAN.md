---
wave: 2
depends_on: ["01", "02"]
gap_closure: false
files_modified:
  - "components/RashidDailyPlanForm.tsx"
  - "components/RashidDailyPlanView.tsx"
  - "README.md"
  - ".planning/ROADMAP.md"
  - ".planning/STATE.md"
autonomous: true
---

<phase_goal>
Polish **Waleed ↔ Rashid ↔ next-day carry-in** loop: Waleed sees carry-in when planning; Rashid sees clear pending/closed states; docs updated.
</phase_goal>

<must_haves>
- [ ] Waleed morning form shows **carry-in per row** when loading a new day (read-only column or hint per work row if `carryIn > 0`) — extend form product blocks / manual rows to display `carryIn` from API `buildPlanView` workRows (data already returned; UI may not show per-row carry-in during edit)
- [ ] Waleed view page: if yesterday not **closed**, show amber note: “Yesterday’s plan not closed by Rashid — carry-in may be 0 until status is recorded.”
- [ ] Rashid dispatch home: if today plan missing, subtle link text only for admin is unnecessary — Rashid sees waiting message only
- [ ] README workflow section:
  1. Waleed → Admin → Rashid plan → morning plan
  2. Rashid → Daily plan → record status at end of day
  3. Next day carry-in automatic when previous day closed
- [ ] Update `ROADMAP.md` Phase 40 entry + `STATE.md` next planned
- [ ] `.planning/phases/40-rashid-daily-plan-portal/40-VERIFICATION.md` — UAT checklist (5 scenarios from research)
</must_haves>

<tasks>
  <task id="1" name="carry-in-visibility">
    <step>On `RashidDailyPlanForm`, when editing/creating plan for date D, show carry-in on each enabled task row (from loaded `workRows` after `buildPlanView` merges previous closed plan).</step>
    <step>Display: `Carry in: N` under target when N &gt; 0; effective = base + carry-in (already computed server-side on save).</step>
  </task>

  <task id="2" name="status-banners">
    <step>Admin `RashidDailyPlanView`: banner when `previousPlanDate` set but previous day exists and `dayStatus !== closed` on prev (optional fetch or pass flag from API).</step>
    <step>Dispatch list: highlight today row when status pending.</step>
  </task>

  <task id="3" name="docs">
    <step>README + ROADMAP + STATE + VERIFICATION.md.</step>
  </task>
</tasks>

<verification>
- E2E: Waleed plans Mon → Rashid closes Mon with shortfall → Waleed plans Tue → same line shows carry-in = Mon carry-out.
- README documents three-step workflow.
- UAT file lists pass/fail checkboxes for factory sign-off.
</verification>
