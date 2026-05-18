---
wave: 2
depends_on: ["17-rashid-daily-filling-waste/01-PLAN.md"]
gap_closure: false
files_modified:
  - "app/(app)/dispatch/filling/page.tsx"
  - "components/BatchFillingGrid.tsx"
  - "app/(app)/layout.tsx"
  - "README.md"
autonomous: true
---

<phase_goal>
Rashid enters **daily filling**, **ready to deliver**, and **physical remaining** on one page — no extra edit screen — and sees **variance vs Nimra** per batch.
</phase_goal>

<must_haves>
- [ ] `/dispatch/filling` — spreadsheet table for **today** (date picker optional v1: today only or simple `?date=`).
- [ ] Columns: Batch / Product | Nimra remaining (L) read-only | Filled today (L) | Ready to deliver (L) | Physical remaining (L) | Variance / waste (L) read-only.
- [ ] Inline edit + save on row blur (same UX as packaging inventory).
- [ ] Only show batches that are not `empty` (or all with remaining &gt; 0 — document choice in SUMMARY).
- [ ] Nav: Rashid + admin links **Daily filling** under dispatch section.
- [ ] README: Rashid workflow + waste meaning + pointer to confirm formula with ops.
</must_haves>

<tasks>
  <task id="1" name="filling-grid-ui">
    <step>`BatchFillingGrid.tsx` client component: fetch GET `/api/batch-filling`, local state, PATCH on blur.</step>
    <step>Highlight variance: red if positive waste &gt; threshold (e.g. &gt; 0), amber if negative.</step>
    <step>`dispatch/filling/page.tsx` server shell: auth, readOnly for admin.</step>
  </task>

  <task id="2" name="nav-docs">
    <step>Add **Daily filling** link next to Packaging inventory in `app/(app)/layout.tsx`.</step>
    <step>README section for Rashid: filling log + waste reconciliation.</step>
  </task>
</tasks>

<verification>
- Login as Rashid → `/dispatch/filling` shows batches with Nimra remaining.
- Enter filled / ready / physical → variance updates; refresh persists.
- Admin read-only, no PATCH.
</verification>
