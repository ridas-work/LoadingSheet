---
wave: 1
depends_on: []
gap_closure: false
files_modified:
  - "lib/roles.ts"
  - "app/api/dispatch-trips/route.ts"
  - "app/api/dispatch-trips/[id]/route.ts"
  - "app/(app)/dispatch/trips/page.tsx"
  - "app/(app)/dispatch/trips/[id]/page.tsx"
  - "app/(app)/dispatch/trips/new/page.tsx"
  - "components/DispatchTripForm.tsx"
autonomous: true
---

<phase_goal>
Make **Ali** the only non-admin user who can create, edit, or discard dispatch trips. Rashid remains able to assign batches, enter carton weights, daily filling, and ready stock, but he cannot create or discard vehicle trips.
</phase_goal>

<must_haves>
- [ ] `ali` with role `dispatch_editor` is the only non-admin dispatch trip planner.
- [ ] POST `/api/dispatch-trips` requires `canCreateDispatchTrips(role, username)`.
- [ ] PATCH `/api/dispatch-trips/[id]` requires `canEditDispatchTrip(role, username)`.
- [ ] DELETE `/api/dispatch-trips/[id]` requires Ali-only trip discard permission.
- [ ] Rashid cannot create trips, edit trip vehicle/PO list, or discard trips by direct API call.
- [ ] Rashid can still view trips and assign batches/carton weights where already allowed.
- [ ] UI wording uses **Discard trip** instead of **Delete trip**.
</must_haves>

<tasks>
  <task id="T1" title="Role helpers">
    <step>Review existing `isDispatchTripPlanner`, `canCreateDispatchTrips`, and `canEditDispatchTrip` in `lib/roles.ts`.</step>
    <step>Add `canDiscardDispatchTrip(role, username)` and make it true for Ali and admin only, or true for Ali only if Waleed should not discard.</step>
    <step>Tighten `canEditDispatchTrip` so it does not return true for all `dispatch_editor`; it should be Ali/admin only.</step>
    <step>Keep `canAssignDispatchBatches` and `canEditDispatch` for Rashid unchanged.</step>
  </task>

  <task id="T2" title="API authorization">
    <step>Update `app/api/dispatch-trips/route.ts` POST to derive `username` from session and call `canCreateDispatchTrips(role, username)`.</step>
    <step>Update `app/api/dispatch-trips/[id]/route.ts` PATCH to call `canEditDispatchTrip(role, username)`.</step>
    <step>Update DELETE to call `canDiscardDispatchTrip(role, username)`.</step>
    <step>Return `403 Forbidden` with clear messages such as `Only Ali can create dispatch trips.`</step>
  </task>

  <task id="T3" title="Trip UI guards">
    <step>In trips list and detail pages, calculate `canEditTrip` with the tightened helper and pass it to UI where needed.</step>
    <step>Hide or disable create/edit/discard controls for Rashid.</step>
    <step>Keep Rashid trip detail links for batch assignment and print loading sheet intact.</step>
    <step>On `/dispatch/trips/new`, redirect Rashid to `/dispatch/trips` or his home path.</step>
  </task>

  <task id="T4" title="Discard trip behavior">
    <step>Rename UI action from `Delete trip` to `Discard trip` in `DispatchTripForm`.</step>
    <step>Keep existing behavior: clear `dispatchTripId` from linked orders, then remove the trip.</step>
    <step>Update confirm text to explain: linked POs will return to available trip planning.</step>
    <step>Do not discard delivered/out-for-delivery history unless current business rules allow it; if needed, block discard when linked orders are not active at factory.</step>
  </task>
</tasks>

<verification>
- Login as Ali: can create a trip, edit trip fields/POs, and discard the trip.
- Login as Rashid: create/edit/discard trip controls hidden; direct POST/PATCH/DELETE calls return 403.
- Rashid can still assign batches/carton weights on loading sheets.
- Linked orders have `dispatchTripId` cleared when Ali discards a trip.
- `npm run build` passes.
</verification>
