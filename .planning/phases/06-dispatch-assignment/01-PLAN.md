---
wave: 1
depends_on: ["05-batch-volume-validation/01-PLAN.md"]
gap_closure: false
files_modified:
  - "lib/roles.ts"
  - "lib/auth.ts"
  - "lib/models/Order.ts"
  - "scripts/seed-users.ts"
  - "app/(app)/layout.tsx"
  - "app/(app)/dispatch/layout.tsx"
  - "app/page.tsx"
  - "app/api/orders/[id]/dispatch/route.ts"
  - "components/LoadingSheetBatchEditor.tsx"
  - "app/(app)/orders/[id]/loading-sheet/page.tsx"
  - "app/(app)/orders/page.tsx"
  - "README.md"
  - ".planning/REQUIREMENTS.md"
autonomous: true
---

<phase_goal>
**Rashid** (dispatch) logs in at `/login`, opens orders, and fills **loading-sheet header + footer** fields: Vehicle No, Driver Name, DC No, Helper Name, Production Incharge, Security, and Driver (footer). Saved values appear on **view/print** for everyone. He cannot create POs or edit batches.
</phase_goal>

<who>
| Display name | Username | Role | Initial password |
|--------------|----------|------|------------------|
| Rashid | `rashid` | `dispatch_editor` | `Rashid-Dispatch-01` |

Same login page as Nouman / Nimra — **no signup**. Seed via `npm run seed:users`.
</who>

<fields_on_loading_sheet>
### Header (top of printed sheet)

| Field | DB field (proposed) |
|-------|---------------------|
| VEHICLE NO | `dispatch.vehicleNo` |
| DRIVER NAME | `dispatch.driverName` |
| DC NO | `dispatch.dcNo` |
| Date | `order.createdAt` (already shown) |
| HELPER NAME | `dispatch.helperName` |

### Footer (signatures block)

| Field | DB field |
|-------|----------|
| PRODUCTION INCHARGE | `dispatch.productionIncharge` |
| SECURITY | `dispatch.securityName` |
| DRIVER | `dispatch.driverSignature` |

**Note:** Header **Driver Name** and footer **Driver** may differ (name vs signature). Default footer Driver to header driver if left blank on save.
</fields_on_loading_sheet>

<how_access_works>
| Role | Home after login | Orders list | View sheet | Edit dispatch |
|------|------------------|-------------|------------|---------------|
| `po_creator` | `/new-order` | ✓ | ✓ print | ✗ |
| `batch_editor` | `/production/batches` | ✓ | ✓ print | ✗ |
| `dispatch_editor` | `/orders` | ✓ | ✓ print | ✓ `?dispatch=1` |

- Extend `lib/roles.ts`: `dispatch_editor` in `AppRole`, `homePathForRole` → `/orders`.
- `lib/auth.ts`: allow `dispatch_editor` in `authorize()` (already uses `isAppRole` — extend list).
- Route guard: Rashid redirected away from `/new-order` and `/production/*` (mirror Nimra pattern).
- Loading sheet: Rashid sees **Edit dispatch** toolbar button → `/orders/[id]/loading-sheet?dispatch=1`.
- **Read-only** batch column and table for Rashid; **editable** only dispatch fields panel (not PO/batch data).
</how_access_works>

<must_haves>
- [ ] User **Rashid** seeded: `rashid`, role `dispatch_editor`, password `Rashid-Dispatch-01`.
- [ ] Auth accepts `dispatch_editor`; session includes `role`; post-login redirect to `/orders`.
- [ ] `Order.dispatch` subdocument (or flat fields) persists all seven text fields + `dispatchUpdatedBy*` + `dispatchUpdatedAt`.
- [ ] **`PATCH /api/orders/[id]/dispatch`** — `dispatch_editor` only; trims strings; does not touch `sheetLines` / batches.
- [ ] Loading sheet **view/print** shows saved dispatch values (replace dotted placeholders).
- [ ] **`/orders`** list: Rashid gets **Edit dispatch** link per row (like Nimra’s Edit batches).
- [ ] PO creators and Nimra **cannot** call dispatch PATCH (403).
- [ ] Rashid **cannot** create POs or edit batches.
</must_haves>

<tasks>
  <task id="1" name="role-and-seed">
    <step>Add `dispatch_editor` to `lib/roles.ts` (`isAppRole`, `homePathForRole` → `/orders`).</step>
    <step>Add Rashid to `scripts/seed-users.ts` default list.</step>
    <step>Update `app/page.tsx` redirect (already uses `homePathForRole`).</step>
  </task>

  <task id="2" name="order-dispatch-schema">
    <step>Add `DispatchSchema` on `Order`: `vehicleNo`, `driverName`, `dcNo`, `helperName`, `productionIncharge`, `securityName`, `driverSignature` (all optional strings, default "").</step>
    <step>Add `dispatchUpdatedByUserId`, `dispatchUpdatedByName`, `dispatchUpdatedAt`.</step>
  </task>

  <task id="3" name="dispatch-api">
    <step>Create `PATCH /api/orders/[id]/dispatch` — body with dispatch fields; auth `dispatch_editor`; 403 others.</step>
    <step>Validate order exists; merge fields; set attribution timestamps.</step>
  </task>

  <task id="4" name="loading-sheet-dispatch-ui">
    <step>Extend `LoadingSheetBatchEditor` (or small `DispatchFieldsPanel` client child): props `canEditDispatch`, `initialDispatch`, `initialDispatchEditMode` (`searchParams.dispatch === "1"`).</step>
    <step>Edit mode: inputs in header/footer regions only (`print:hidden` chrome); saved values in print layout.</step>
    <step>Save → PATCH dispatch API; success refresh view mode.</step>
    <step>`loading-sheet/page.tsx`: pass dispatch data from order; `canEditDispatch = role === "dispatch_editor"`.</step>
  </task>

  <task id="5" name="nav-guards-links">
    <step>`new-order/layout.tsx`: redirect `dispatch_editor` → `/orders`.</step>
    <step>`production/layout.tsx`: redirect `dispatch_editor` → `/orders`.</step>
    <step>Optional `app/(app)/dispatch/layout.tsx` if needed; prefer reusing `/orders` without new top-level route.</step>
    <step>`orders/page.tsx`: **Edit dispatch** link for `dispatch_editor` → `?dispatch=1`.</step>
    <step>`app/(app)/layout.tsx`: nav — Rashid sees **Orders** only (no New order).</step>
  </task>

  <task id="6" name="docs">
    <step>README: Rashid credentials + workflow (after batches → Rashid dispatch → print).</step>
    <step>REQUIREMENTS.md Phase 06 section.</step>
  </task>
</tasks>

<out_of_scope>
- Multi-order one truck (combine POs on one sheet) — future.
- Hard **lock** after dispatch (read-only forever) — optional Phase 06b; v1 allows Rashid to re-edit until stakeholder asks for lock.
- Nimra/PO editing dispatch fields — forbidden.
</out_of_scope>

<verification>
- `npm run seed:users` → Rashid can log in.
- Rashid: `/orders` → open sheet → Edit dispatch → fill Vehicle, Driver, DC, Helper, Production Incharge, Security, Driver footer → Save → print shows values.
- Nouman: view same sheet, fields visible, no Edit dispatch UI; PATCH dispatch → 403.
- `npm run build` passes.
</verification>
