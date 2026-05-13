---
wave: 2
depends_on: ["09-multi-po-vehicle-dispatch/01-PLAN.md"]
gap_closure: false
files_modified:
  - "app/(app)/dispatch/trips/page.tsx"
  - "app/(app)/dispatch/trips/new/page.tsx"
  - "app/(app)/dispatch/trips/[id]/page.tsx"
  - "components/DispatchTripForm.tsx"
  - "components/DispatchTripOrderPicker.tsx"
  - "app/(app)/orders/page.tsx"
  - "app/(app)/layout.tsx"
  - "lib/roles.ts"
  - "README.md"
autonomous: true
---

<phase_goal>
Rashid UI to **build and edit a vehicle dispatch** with **multiple POs**: pick orders, enter vehicle/driver once, assign batches per PO (existing loading sheet), save trip, print each PO sheet with shared header/footer.
</phase_goal>

<user_flow>
1. Rashid lands on **`/dispatch/trips`** (new home option alongside Orders).
2. **New trip** → multi-select POs from list (only orders not already on another trip, or allow move with confirm).
3. Enter **vehicle, driver, DC, helper, footer** once on trip form.
4. **Save trip** → syncs dispatch fields to all linked orders.
5. Trip detail shows linked POs with links:
   - **Assign batches** → `/orders/[id]/loading-sheet?dispatch=1` (unchanged per-PO flow)
   - **View / print sheet** → view mode
6. **Print all** — open each loading sheet in sequence or list of print links (v1: button per PO on trip page).
7. Orders list: badge **On trip** + vehicle no when linked; Rashid can **Add to trip** from multi-select or trip editor.
</user_flow>

<must_haves>
- [ ] **`/dispatch/trips`** — Rashid list of trips (vehicle, date, PO count, PO numbers).
- [ ] **`/dispatch/trips/new`** and **`/dispatch/trips/[id]`** — shared `DispatchTripForm` (multi PO picker + dispatch fields).
- [ ] Nav: Rashid sees **Dispatch trips** (and **Orders**); `homePathForRole` → `/dispatch/trips` or keep `/orders` with prominent trips link — **prefer `/dispatch/trips` as Rashid home**.
- [ ] Orders page: optional multi-select + **Create trip with selected** for Rashid; show trip badge on rows.
- [ ] Per-PO batch assignment unchanged; trip save does not require all batches filled.
- [ ] README workflow updated.
</must_haves>

<tasks>
  <task id="1" name="dispatch-layout">
    <step>`app/(app)/dispatch/layout.tsx` — `dispatch_editor` only; redirect others.</step>
    <step>Update `homePathForRole` → `/dispatch/trips` for Rashid.</step>
  </task>

  <task id="2" name="trip-ui">
    <step>Trip list + new + edit pages.</step>
    <step>`DispatchTripOrderPicker` — checkboxes on available orders.</step>
    <step>Save → POST/PATCH trip API.</step>
  </task>

  <task id="3" name="orders-integration">
    <step>Orders list badges + link to parent trip.</step>
    <step>Keep **Edit dispatch** per PO for batch assignment; header fields read-only on sheet when order is on a trip (loaded from synced `order.dispatch`) — optional hint: "Edit vehicle on trip page".</step>
  </task>
</tasks>

<out_of_scope>
- Drag-and-drop reorder POs on truck.
- Auto-suggest PO combinations by capacity.
</out_of_scope>

<verification>
- Rashid: create trip with PO 234 + another PO, same vehicle on both sheets after save.
- Assign batches per PO; print both sheets show same vehicle/driver.
- `npm run build` passes.
</verification>
