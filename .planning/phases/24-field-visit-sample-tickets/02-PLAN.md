---
wave: 2
depends_on: ["24-field-visit-sample-tickets/01-PLAN.md"]
gap_closure: false
files_modified:
  - "app/(app)/field-visits/page.tsx"
  - "app/(app)/field-visits/[id]/page.tsx"
  - "app/(app)/layout.tsx"
  - "components/FieldVisitList.tsx"
  - "components/FieldVisitDetailForm.tsx"
  - "app/(app)/new-order/page.tsx"
autonomous: true
---

<phase_goal>
Nouman and Javeria get a dedicated UI to manage their visit tickets end-to-end and start POs from won visits.
</phase_goal>

<must_haves>
- [ ] Nav link **Field visits** visible only for `nouman` and `javeria` (same `po_creator` role; restrict by username in page guard).
- [ ] **List page** shows open tickets with status badges, points if closed, linked PO number if any.
- [ ] **New visit / Request sample** form: place name, city, customer name, contact, notes, products to sample (multi-select from catalog or free text).
- [ ] **Detail page** stepper UI: (1) Requested (2) Mark sample delivered + feedback form (3) Conclude visit (4) Outcome — show won/lost pending, button to create PO if won and not yet linked.
- [ ] **`/new-order`** optional banner: “Link to visit” dropdown of my `visit_concluded` tickets matching customer name (fuzzy) or explicit select.
- [ ] Pass `visitTicketId` on order submit when selected.
- [ ] Positive/negative messaging on close: toast or banner “+10 points” / “−5 points”.
</must_haves>

<tasks>
  <task id="1" name="routes-layout">
    <step>Add `/field-visits` under `(app)` with guard: session + username in {nouman, javeria} OR helper `canAccessFieldVisits(role, username)`.</step>
    <step>Update app layout nav for Nouman/Javeria only.</step>
  </task>

  <task id="2" name="list-and-create">
    <step>Build `FieldVisitList` client component: fetch `/api/field-visits`, filters (Open / Awaiting order / Closed).</step>
    <step>Build create-sample form → POST ticket.</step>
  </task>

  <task id="3" name="detail-workflow">
    <step>Build `FieldVisitDetailForm` with actions gated by status; PATCH endpoints per step.</step>
    <step>“Mark lost” with required reason when visit concluded but no order after X days or manual.</step>
    <step>“Create order from visit” deep-links to `/new-order?visitTicketId=...` with customer/city prefilled.</step>
  </task>

  <task id="4" name="new-order-link">
    <step>On `/new-order`, if `visitTicketId` query param or dropdown selection, prefill customer/city and include hidden field in POST body.</step>
  </task>
</tasks>

<verification>
- `npm run build` passes.
- Nouman can complete full flow on mobile-width layout without horizontal scroll breakage.
- Order created from concluded visit closes ticket and shows on list as won.
</verification>
