---
wave: 2
depends_on: ["11-lock-production-batches/01-PLAN.md"]
gap_closure: false
files_modified:
  - "app/(app)/production/batches/page.tsx"
  - "app/(app)/production/batches/[id]/page.tsx"
  - "app/(app)/production/batches/[id]/edit/page.tsx"
  - "components/ProductionBatchRowActions.tsx"
autonomous: true
---

<phase_goal>
Nimra's batch list and detail show **Available / In use / Empty** and hide **Edit / Delete** when the batch is locked (in use or fully empty).
</phase_goal>

<user_flow>
1. Nimra opens **Production batches**.
2. Each row shows **Status**: Available · In use (12 L left) · Empty.
3. **Available** → Edit + Delete as today.
4. **In use** or **Empty** → no Edit/Delete; batch no links to read-only detail with status badge.
5. Direct URL to `/edit` on locked batch → redirect to detail with message.
</user_flow>

<must_haves>
- [ ] List column **Status** with remaining liters when in use.
- [ ] `ProductionBatchRowActions` receives `locked` — hides Edit/Delete when true.
- [ ] Detail page: status badge; Edit button only when available.
- [ ] Edit page redirects if locked.
</must_haves>

<tasks>
  <task id="1" name="list-status">
    <step>Load orders + catalog once on batches page; compute per-batch status.</step>
    <step>Pass `locked` to row actions.</step>
  </task>
  <task id="2" name="detail-edit">
    <step>Detail shows status + remaining liters.</step>
    <step>Edit page server redirect when locked.</step>
  </task>
</tasks>

<verification>
- Batch with 0 L remaining shows **Empty**, no Edit.
- Batch partially used shows **In use**, no Edit.
- Fresh batch shows **Available**, Edit works.
- `npm run build` passes.
</verification>
