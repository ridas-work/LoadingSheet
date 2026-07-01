---
wave: 3
depends_on: ["43-esha-close-batch-waste/02-PLAN.md"]
gap_closure: false
files_modified:
  - "app/(app)/production/batches/page.tsx"
  - "app/(app)/production/batches/closed/page.tsx"
  - "app/(app)/production/batches/[id]/page.tsx"
  - "app/(app)/production/batches/[id]/edit/page.tsx"
  - "components/ProductionBatchCloseForm.tsx"
  - "components/ProductionBatchRowActions.tsx"
  - "app/(app)/production/layout.tsx"
autonomous: true
---

<phase_goal>
**Esha UI** — close batch workflow, **Closed batches** archive route, read-only closed detail; active list hides closed rows.
</phase_goal>

<must_haves>
- [ ] `/production/batches` — only **open** batches (`closedAt: null`); tab bar adds link **Closed batches** → `/production/batches/closed`
- [ ] `/production/batches/closed` — table of closed batches (batch no, product, purpose, closed date, waste L, closed by); rows link to detail; no Edit
- [ ] `/production/batches/[id]` — if open + `batch_editor` + approved: show **Close batch** section with `ProductionBatchCloseForm` (check confirm, waste L input prefilled from remaining, optional note, submit)
- [ ] `/production/batches/[id]` — if closed: show closure block (waste, snapshots, closed by/at); **no** Edit / Close buttons
- [ ] `/production/batches/[id]/edit` — redirect to detail if `closedAt` set
- [ ] `ProductionBatchRowActions` — no Edit for closed batches
- [ ] Admin can view closed list + detail read-only
</must_haves>

<tasks>
  <task id="1" name="closed-route">
    <step>Create `app/(app)/production/batches/closed/page.tsx` — query `{ closedAt: { $ne: null } }`, sort `closedAt` desc.</step>
    <step>Reuse table styling from main batches page; columns: batch, product, purpose, closed, waste L, by.</step>
    <step>Add nav tab on both open and closed list pages.</step>
  </task>

  <task id="2" name="close-form">
    <step>Create `components/ProductionBatchCloseForm.tsx` — client form POSTing to close API.</step>
    <step>Props: `batchId`, `remainingLiters`, `usedLiters`, `batchNo`; on success `router.push('/production/batches/closed')` + refresh.</step>
    <step>Checkbox "I have checked this batch"; waste input with validation hints.</step>
  </task>

  <task id="3" name="detail-edit-guards">
    <step>Update `[id]/page.tsx` — branch open vs closed UI; embed close form when eligible.</step>
    <step>Update `[id]/edit/page.tsx` — redirect if closed (like discarded).</step>
    <step>Update main `batches/page.tsx` — `openProductionBatchMongoFilter()` on queries.</step>
    <step>Update `ProductionBatchRowActions` for closed state.</step>
  </task>
</tasks>

<verification>
- Esha: open batch detail → enter waste → close → appears on Closed batches only.
- Closed batch detail has no Edit; direct `/edit` URL redirects.
- Rashid batch picker does not show closed batch.
- `npm run build` && `pm2 restart loadingsheet`.
</verification>
