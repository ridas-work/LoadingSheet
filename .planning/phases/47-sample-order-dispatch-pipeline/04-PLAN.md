---
wave: 2
depends_on: ["01-PLAN.md", "03-PLAN.md"]
gap_closure: false
files_modified:
  - "app/(app)/dispatch/sample-trips/page.tsx"
  - "app/(app)/dispatch/sample-trips/new/page.tsx"
  - "app/(app)/dispatch/sample-trips/[id]/page.tsx"
  - "app/api/dispatch-trips/route.ts"
  - "app/api/dispatch-trips/[id]/route.ts"
  - "components/DispatchTripForm.tsx"
  - "components/DispatchTripOrderPicker.tsx"
autonomous: true
---

<phase_goal>
**Ali** creates and manages **sample trips** at **`/dispatch/sample-trips`** — separate from regular PO trips, picking only sample orders with batches assigned.
</phase_goal>

<must_haves>
- [ ] `/dispatch/sample-trips` lists trips where `tripKind === "sample"`.
- [ ] `/dispatch/sample-trips/new` — Ali creates trip; picker shows only `field_sample` orders ready for dispatch (batches complete, not on trip).
- [ ] POST/PATCH dispatch-trips accepts `tripKind`; validates no mixing sample + regular orderIds.
- [ ] Regular `/dispatch/trips` excludes `tripKind: sample`.
- [ ] Sample trip detail: vehicle/driver/DC, per-sample challan if needed, link to combined loading sheet.
- [ ] Nav: Ali sees **Sample trips** next to regular Trips.
</must_haves>

<tasks>
  <task id="T1" title="Sample trips pages">
    <step>Clone trips page structure under `dispatch/sample-trips/` with `tripKind: sample` filter.</step>
    <step>Trip form passes `orderKindFilter: "field_sample"` to order picker.</step>
  </task>

  <task id="T2" title="API tripKind">
    <step>Extend `POST /api/dispatch-trips` and PATCH with `tripKind` default `regular`.</step>
    <step>`assertOrdersAvailableForTrip` checks order kind matches trip kind.</step>
    <step>GET list endpoints or page queries filter by tripKind.</step>
  </task>

  <task id="T3" title="Regular trip isolation">
    <step>Regular trips page filters `tripKind !== sample` (or missing = regular).</step>
    <step>Regular trip create picker excludes `field_sample` orders.</step>
  </task>

  <task id="T4" title="Loading sheet">
    <step>Sample trip loading sheet at `/dispatch/sample-trips/[id]/loading-sheet` (or reuse trips path with kind guard).</step>
    <step>Print header labels sample dispatch clearly.</step>
  </task>
</tasks>

<verification>
- Ali can create sample trip with 1+ sample orders; cannot add regular PO.
- Regular trip cannot include sample order.
- `npm run build` passes.
</verification>
