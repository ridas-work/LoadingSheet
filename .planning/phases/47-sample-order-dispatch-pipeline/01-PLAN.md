---
wave: 1
depends_on: []
gap_closure: false
files_modified:
  - "lib/models/Order.ts"
  - "lib/models/DispatchTrip.ts"
  - "lib/models/FieldVisitTicket.ts"
  - "lib/sampleOrderFromVisit.ts"
  - "lib/orderKind.ts"
autonomous: true
---

<phase_goal>
Introduce **field sample orders** and **sample trips** as first-class kinds, linked to approved field visits, separate from regular POs.
</phase_goal>

<must_haves>
- [ ] `Order.orderKind` adds `field_sample`; `fieldVisitTicketId` on Order; synthetic `poNumber` like `SAMPLE-…`.
- [ ] `DispatchTrip.tripKind` adds `regular` (default) and `sample`.
- [ ] `FieldVisitTicket` stores `sampleDispatchOrderId` (or reuse `linkedOrderId`) + `sampleDispatchStatus`.
- [ ] `lib/sampleOrderFromVisit.ts` builds items/sheetLines from `sampleProducts` + catalog bottles/liters.
- [ ] Helpers: `isFieldSampleOrder`, `regularOrdersFilter`, `sampleOrdersFilter`, `regularTripsFilter`, `sampleTripsFilter`.
</must_haves>

<tasks>
  <task id="T1" title="Order + trip schema">
    <step>Add `field_sample` to `orderKind` enum; add `fieldVisitTicketId`, `sampleStockDeductedAt` on Order.</step>
    <step>Add `tripKind` to DispatchTrip default `regular`.</step>
    <step>Document that `poNumber` for samples uses `SAMPLE-{ticketId last 6}` or sequential suffix.</step>
  </task>

  <task id="T2" title="sampleOrderFromVisit builder">
    <step>Create `buildSampleOrderFromVisit(ticket, catalog)` returning order payload: customerName, city, items, sheetLines.</step>
    <step>One sheet line per product with `bottles` from ticket; batchNo empty until Rashid assigns.</step>
  </task>

  <task id="T3" title="Filter helpers">
    <step>Create `lib/orderKind.ts` (or extend existing) with mongo filters used by list APIs and trip pickers.</step>
    <step>Ensure regular PO lists exclude `field_sample`; sample lists include only `field_sample`.</step>
  </task>
</tasks>

<verification>
- Types compile; existing orders default to `standard` / trips to `regular`.
- `npm run build` passes.
</verification>
