---
wave: 1
depends_on: ["22-hybrid-order-custom-boxes/03-PLAN.md"]
gap_closure: false
files_modified:
  - "lib/models/FieldVisitTicket.ts"
  - "lib/fieldVisitTickets.ts"
  - "lib/models/Order.ts"
  - "lib/orderPayload.ts"
  - "app/api/field-visits/route.ts"
  - "app/api/field-visits/[id]/route.ts"
  - "app/api/orders/route.ts"
autonomous: true
---

<phase_goal>
Give **Nouman and Javeria** a visit ticket workflow: request a sample, record delivery and customer feedback, conclude the visit, then close the ticket with **positive or negative points** when a real order is confirmed or the opportunity is lost.
</phase_goal>

<must_haves>
- [ ] **`FieldVisitTicket` model** with lifecycle statuses: `sample_requested` → `sample_delivered` → `visit_concluded` → `closed_won` | `closed_lost` (document exact enum names in code).
- [ ] **Only Nouman and Javeria** can create/update their own visit tickets (enforce by `createdByUserId` or username allowlist `nouman`, `javeria`).
- [ ] **Sample request** creates an open ticket with place/customer fields (business name, city, contact, notes, optional products for sample).
- [ ] **Sample delivered** step records `sampleDeliveredAt` and allows customer data + feedback (`liked` / `disliked` / `neutral` / `pending`) and comments.
- [ ] **Conclude visit** moves ticket to `visit_concluded` (awaiting order outcome); cannot conclude until sample delivered step is done.
- [ ] **Order linkage:** optional `visitTicketId` on order create; when order is saved successfully, ticket can auto-close `closed_won` with positive points; admin can manually mark `closed_lost` with negative points.
- [ ] **Points:** store `pointsAwarded` on ticket (+ for win, − for loss); expose running totals per rep in list API.
- [ ] **Reject / no order:** explicit action or timeout policy documented — v1: manual **Mark lost** by rep or admin with reason; optional auto `closed_lost` if no linked order within N days (configurable constant, e.g. 90 days) as follow-up task note only if too heavy for v1.
- [ ] **POST /api/orders** accepts optional `visitTicketId`; validates ticket is `visit_concluded` and owned by same rep before linking.
</must_haves>

<tasks>
  <task id="1" name="ticket-model">
    <step>Create `FieldVisitTicket` schema: placeName, customerName, city, contactPhone, contactPerson, notes, status, sampleRequestedAt, sampleDeliveredAt, visitConcludedAt, closedAt, sampleFeedback, feedbackComments, pointsAwarded, linkedOrderId, createdByUserId, createdByName, closedByUserId, closedReason.</step>
    <step>Add indexes: `createdByUserId + status`, `linkedOrderId`, `customerName`.</step>
  </task>

  <task id="2" name="ticket-helpers-api">
    <step>`lib/fieldVisitTickets.ts`: status transitions, allowed actions per status, point rules (+10 win, −5 loss defaults — document in code), `assertCanEditVisit(userId)`.</step>
    <step>`GET/POST /api/field-visits` — list (filter by mine/all for admin), create sample request.</step>
    <step>`GET/PATCH /api/field-visits/[id]` — deliver sample, conclude visit, close won/lost, link order id.</step>
  </task>

  <task id="3" name="order-link">
    <step>Add optional `visitTicketId` to order body type in `lib/orderPayload.ts` parser (not required for all orders).</step>
    <step>On successful `Order.create` in `app/api/orders/route.ts`: if `visitTicketId` present, call resolver to close ticket won, set `linkedOrderId`, award points.</step>
    <step>Prevent double-linking one ticket to multiple orders.</step>
  </task>
</tasks>

<verification>
- `npm run build` passes.
- API returns 403 if Aslam tries to create a field visit.
- Ticket cannot skip from requested → delivered → concluded without validation errors.
- Creating order with valid `visitTicketId` closes ticket as won and sets points &gt; 0.
</verification>
