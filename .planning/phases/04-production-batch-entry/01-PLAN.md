---
wave: 1
depends_on: []
files_modified:
  - "lib/auth.ts"
  - "lib/models/User.ts"
  - "lib/models/Order.ts"
  - "scripts/seed-users.ts"
  - "app/(app)/layout.tsx"
  - "app/page.tsx"
  - "app/(app)/production/batches/page.tsx"
  - "app/(app)/production/orders/[id]/page.tsx"
  - "app/api/orders/route.ts"
  - "app/api/orders/[id]/batches/route.ts"
  - ".planning/REQUIREMENTS.md"
  - "README.md"
autonomous: true
---

<phase_goal>
**Nimra** (production) can log in and **add or update batch numbers only** on existing orders—one batch per **box row** on the loading sheet. She cannot create POs or edit weights/dispatch. PO creators keep their current access unchanged.
</phase_goal>

<how_access_works>
| Role | Username (proposed) | Password (initial) | After login |
|------|---------------------|--------------------|-------------|
| `po_creator` | nouman, javeria, aslam, ibtisam | (existing) | `/new-order` |
| `batch_editor` | `nimra` | `Nimra-Batch-01` | `/production/batches` |

- Same **login page** (`/login`) — no signup.
- **Seed** adds Nimra via `npm run seed:users` (extend default list to 5 users OR separate `seed:production-user` — prefer one seed script with role field).
- **`lib/auth.ts`**: allow `po_creator` **or** `batch_editor` to sign in (today only `po_creator` passes `authorize`).
- **Route guards** in `(app)/layout.tsx` or per-route:  
  - `po_creator` → `/new-order`, `/orders/*/loading-sheet` (view/print)  
  - `batch_editor` → `/production/*` only; redirect away from `/new-order`  
  - Wrong role → friendly “Not allowed” or redirect to home for their role
</how_access_works>

<how_she_adds_batches>
**Workflow (simple, matches paper sheet):**

1. Nimra opens **`/production/batches`** — list of recent orders (PO, customer, date, progress: e.g. “12/32 batches filled”).
2. Taps an order → **`/production/orders/[id]`** — table like loading sheet but **editable column = Batch No only**:
   - Columns: Box No, Product, Bottles (read-only), **Batch No** (input), Weight (read-only empty for now).
3. **Fill strategy** (pick one in implementation; recommend **A** for speed):
   - **A — Per row:** each carton row has its own batch field (matches your paper when weights differ per box).
   - **B — Per product group:** enter batch once for “all Rhino rows” and apply to consecutive same-product rows (optional enhancement).
4. **Save** → `PATCH /api/orders/[id]/batches` with `{ updates: [{ boxNo, batchNo }] }` or full `sheetLines` batch fields; server validates role `batch_editor`, trims batch strings, does **not** change weight/PO/customer.
5. Optional: **“Mark batches complete”** sets `order.status = batches_complete` for dispatch queue (Phase 05).

Data already exists: `Order.sheetLines[].batchNo` — loading sheet print view reads it automatically once saved.
</how_she_adds_batches>

<must_haves>
- [ ] User **Nimra** seeded: `name: Nimra`, `username: nimra`, `role: batch_editor`, password `Nimra-Batch-01`.
- [ ] Auth accepts `batch_editor`; session includes `role`.
- [ ] Post-login redirect by role (`/` or login callback).
- [ ] **`GET /api/orders`** (or `/api/orders?for=batch`) — list orders for batch screen; `batch_editor` only.
- [ ] **`PATCH /api/orders/[id]/batches`** — update `sheetLines[].batchNo` by `boxNo`; 403 for `po_creator` if you want strict split (or read-only for PO creators).
- [ ] UI: production list + batch entry table; mobile-friendly inputs.
- [ ] Nimra **cannot** access `POST /api/orders` (create PO).
- [ ] Loading sheet shows saved batch numbers when printed.
- [ ] README + REQUIREMENTS document Nimra credentials and workflow.
</must_haves>

<tasks>
  <task id="T1" title="Roles + Nimra seed + auth">
    <steps>
      <step>Extend `authorize()` to allow roles `po_creator` | `batch_editor`.</step>
      <step>Add Nimra to `seed-users.ts` (5 users total; keep SEED_USERS_JSON override).</step>
      <step>Role-based redirect in `app/page.tsx` and after login.</step>
    </steps>
    <verification>
      <check>Nimra can log in; PO users still can; invalid role rejected.</check>
    </verification>
  </task>

  <task id="T2" title="API — list orders + patch batches">
    <steps>
      <step>`GET /api/orders` with auth: po_creator gets own list optional; batch_editor gets orders needing batches (all recent, limit 50).</step>
      <step>`PATCH .../batches`: validate boxNo exists; set batchNo; optional `batchUpdatedBy` / `batchUpdatedAt` on order.</step>
    </steps>
    <verification>
      <check>Patch persists; loading sheet reflects batchNo.</check>
    </verification>
  </task>

  <task id="T3" title="Production UI for Nimra">
    <steps>
      <step>`/production/batches` — order list with link to detail.</step>
      <step>`/production/orders/[id]` — editable batch column + Save.</step>
      <step>Header nav: Nimra sees “Batch entry” not “New order”.</step>
    </steps>
    <verification>
      <check>Nimra completes flow without seeing PO form.</check>
    </verification>
  </task>

  <task id="T4" title="Route protection">
    <steps>
      <step>Middleware or layout checks: batch_editor blocked from `/new-order`; po_creator blocked from PATCH batches if strict.</step>
    </steps>
    <verification>
      <check>Direct URL to wrong area redirects.</check>
    </verification>
  </task>
</tasks>

<definition_of_done>
Nimra logs in, opens an order, enters batch numbers per box row, saves, and the printable loading sheet shows those batch numbers. PO team workflow unchanged.
</definition_of_done>
