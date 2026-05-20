---
wave: 2
depends_on: ["22-hybrid-order-custom-boxes/01-PLAN.md"]
gap_closure: false
files_modified:
  - "app/(app)/new-order/page.tsx"
autonomous: true
---

<phase_goal>
PO team uses **one screen**: standard product/carton grid **plus** **Add custom carton** (Create box) to define multi-SKU boxes; live **preview** of total loading-sheet rows before submit.
</phase_goal>

<must_haves>
- [ ] Remove or replace the **either/or** radio that blocks mixing; default flow = **standard grid always visible** when not legacy mixed-only mode.
- [ ] **Add custom carton** adds a repeatable card: contents editor (product + bottles per line, add row), **identical carton count**, optional label; **Remove** per card.
- [ ] Submit JSON includes `items` + `customCartons` (and `orderKind` as per plan 01).
- [ ] Client-side validation mirrors server (empty custom block cannot submit).
- [ ] Optional: show “**Total cartons:** N” summary (standard carton sum + sum of custom `boxCount`).
</must_haves>

<tasks>
  <task id="1" name="new-order-ui">
    <step>Refactor `new-order/page.tsx` state: `customCartons` array state; handlers; submit body.</step>
    <step>UX copy: explain that custom carton = **several products packed in one physical box** (use AMIR-style example in help text).</step>
  </task>
</tasks>

<verification>
- User can enter Rhino lines + add one custom carton with 4 SKUs × counts + boxCount 3 → submit succeeds.
- Toggle / migration: old “mixed sample only” orders still loadable if preserved as separate mode (document in UI: “Legacy: mixed sample only order” optional small link vs main hybrid flow).
</verification>
