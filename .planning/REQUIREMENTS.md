# Requirements

## Phase 01 (Authorized PO Entry)

### Users & Access
- Exactly **4 authorized people** can create PO entries.
- Each authorized user logs in using **name + password**.
- System must record **who created** each PO (user identity + timestamp).

### Data to capture (per order)
- **PO number**
- **Customer name**
- **Product name**
- **No. of bottles**

### UX
- Very simple, form-first UI (fast entry, minimal clicks).
- Basic validations (required fields, bottles must be positive integer).

### Storage
- Persist to **MongoDB** (Atlas-ready).

### Admin/Operations (Phase 01)
- Seed/define the 4 users (initially via environment/seed script, not a UI).

---

## Phase 02 (Production updates & loading sheet)

### Bottles vs boxes (must define before printing rows)

Your paper sheet uses **one row per box/carton**, with **NO OF BOTTLES** often fixed per row (e.g. 10).

The app currently stores **one number per product line** (`items[].bottles`). That number does **not** by itself mean “10 separate Rhino rows” unless we adopt a rule:

| Rule | Meaning of “Rhino, 10” | Rows on sheet |
|------|-------------------------|----------------|
| **A** | 10 **total bottles** | Expand using `ceil(10 / bottles_per_box)` (e.g. box size 10 ⇒ **1 row**) |
| **B** | 10 **cartons/boxes** | **10 rows**, each row gets bottles-per-box (default e.g. 10) |
| **C** | Summary only | **1 row** (no multi-box expansion yet) |

**Stakeholder must choose A or B** for operational accuracy; C is only for early prototyping.

**Decision (Phase 02 implemented): Rule B — Cartons + bottles per carton.**  
Each PO line has **cartons** (number of boxes on the truck) and **bottles per carton** (default 10). The printed loading sheet has **one row per carton**; “NO OF BOTTLES” shows bottles per carton.

### Loading sheet output

After PO submit success:

- Offer **View / Print loading sheet** with columns aligned to paper: Box No, Product Name, No of Bottles, Batch No (blank until production), Weight (blank), PO NO, Customer Co; header placeholders for DC No, Date, Vehicle, Driver, Helper until Phase 04 (dispatch).

### Production

- Production users fill **Batch No** and **Weight** per row (later screens/API).

### Product packing catalog & samples (planned — execute after product list is provided)

**Idea (approved direction):** Each **packing / SKU** has a **default bottles per carton** (e.g. Rhino 750 ML → 10). When creating a PO line, picking that product **auto-fills** “bottles per carton”; the user can **edit / override** that value for exceptions.

**Samples:** Usually **1 carton** with **bottles per carton = 1** (one loading-sheet row, “NO OF BOTTLES” = 1). No need for a separate “sample product” in the master list unless you want it for reporting.

**Master data:** Stored in MongoDB (e.g. `ProductPacking` collection), seeded from a JSON file you provide: product display name, optional code, `bottlesPerCarton`.

**Fallback:** If a product is not in the catalog yet, allow **custom product name** + manual bottles/carton (same as today).

Executable plan: `.planning/phases/02-production-updates/03-PLAN.md`.

**Catalog file:** `data/product-packings.json` — each entry:

```json
{ "code": "rhino-750ml", "name": "Rhino 750ml", "bottlesPerCarton": 10, "aliases": [] }
```

`code` is unique (lowercase slug). Run `npm run seed:products` after editing the file.

---

## Phase 03 (Order portal access — no signup) — **implemented**

### Authorized users (exactly 4)

| Display name | Username | Initial password (hand to user; rotate later) |
|--------------|----------|----------------------------------|
| Nouman | `nouman` | `Nouman-Order-01` |
| Javeria | `javeria` | `Javeria-Order-02` |
| Aslam | `aslam` | `Aslam-Order-03` |
| Ibtisam | `ibtisam` | `Ibtisam-Order-04` |

### Rules

- **No signup:** accounts exist only via `npm run seed:users` (or `SEED_USERS_JSON`). `/signup` / `/register` do not create users.
- **Login:** `/login` with username + password; NextAuth session required for `/new-order` and order APIs.
- **Attribution:** each `Order` stores `createdByUserId` + `createdByName` from the session.

### Env

- `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `MONGODB_URI` required for login + seed.

Executable plan: `.planning/phases/03-order-portal-auth/01-PLAN.md`.

---

## Phase 04 (Production batch entry — Nimra) — **complete**

### Who

| Display name | Username | Role | Initial password |
|--------------|----------|------|------------------|
| Nimra | `nimra` | `batch_editor` | `Nimra-Batch-01` |

### What she can do

- Log in at `/login` (same as everyone; **no signup**).
- Land on **`/production/batches`** — see orders waiting for batch numbers.
- Open an order → table of **box rows** (Box No, Product, Bottles read-only).
- Enter **Batch No** per row (matches paper loading sheet column).
- **Save** — updates `Order.sheetLines[].batchNo` in MongoDB.
- **Cannot:** create POs, edit customer/PO, edit weight, or dispatch fields.

### What PO team still does

- Nouman / Javeria / Aslam / Ibtisam: **`/new-order`** unchanged.
- After Nimra saves batches, **View loading sheet** shows batch column filled.

### Technical notes

- Extend auth: allow `role` ∈ `{ po_creator, batch_editor }`.
- New API: `PATCH /api/orders/[id]/batches`.
- Optional later: “apply same batch to all boxes of this product” shortcut.

Executable plan: `.planning/phases/04-production-batch-entry/01-PLAN.md`.

### Follow-up — orders list + loading sheet for everyone (plan 02) — **complete**

- **`/orders`** — all logged-in users browse orders; **View loading sheet** on every row.
- **`/orders/[id]/loading-sheet`** — view/print for everyone; Nimra gets **Edit batches** mode (batch column inputs only, same paper layout).
- Recommended over batch entry *only* on a separate form: keeps print preview accurate while avoiding print/CSS pain of always-on inputs.

Executable plan: `.planning/phases/04-production-batch-entry/02-PLAN.md`.

---

## Phase 05 (Batch volume & weight validation) — **complete**

### Business rule

A **batch number** identifies one production run with a **fixed total volume** (liters). Cartons filled from that batch consume:

```
liters per carton = bottles per carton × liters per bottle (from product catalog)
```

Sum of liters for all rows sharing a `batchNo` on an order **must not exceed** the batch total Nimra entered.

**Example:** Batch `B1` = 1000 L; bottle size 100 L; 10 bottles per carton → one carton row uses 1000 L (entire batch). A second row on `B1` → **error**.

### Nimra enters

- **Batch No** per carton row (existing).
- **Total batch liters** once per batch number on the order (e.g. `1000`).

### System calculates

- **Weight** per row on the loading sheet (liters per carton) — auto, not typed per row in v1.
- **Validation** on save — reject over-allocation with clear message.

### Loading sheet display

| Field | Print | Screen (edit) |
|-------|-------|----------------|
| Weight per row | Yes | Yes |
| Batch total / used / remaining | No | Yes (helper for Nimra) |

### Data

- `ProductPacking.litersPerBottle` (catalog). Stickers may show kg; **liters** used in app.
- `Order.batchDefs[]`: `{ batchNo, totalLiters }`.

Executable plan: `.planning/phases/05-batch-volume-validation/01-PLAN.md`.

---

## Phase 06 (Dispatch — Rashid) — **complete**

### Who

| Display name | Username | Role | Initial password |
|--------------|----------|------|------------------|
| Rashid | `rashid` | `dispatch_editor` | `Rashid-Dispatch-01` |

### What he fills (on loading sheet)

**Header:** Vehicle No, Driver Name, DC No, Helper Name (Date = order date).

**Footer:** Production Incharge, Security, Driver (signature line).

### Rules

- Login at `/login` (no signup); seed with `npm run seed:users`.
- Opens **Orders** → **Edit dispatch** on loading sheet (`?dispatch=1`).
- Cannot create POs or edit batches.
- PO team + Nimra can **view/print** completed sheet; cannot edit dispatch fields.

Executable plan: `.planning/phases/06-dispatch-assignment/01-PLAN.md`.

---

## Phase 07 (Session security & mandatory login) — **complete**

### Problem

Users open the site and are still logged in from a previous visit (NextAuth default 30-day session). Stakeholder wants **credentials required** when someone opens the app again, even if they did not click **Log out**.

### Requirements

- **Global auth gate:** middleware redirects unauthenticated users to `/login` for all app routes and APIs (except auth endpoints).
- **No persistent login across browser restarts:** session cookie is browser-session only (expires when browser closes).
- **In-browser cap:** JWT valid up to **8 hours** per login while the browser stays open (override via `SESSION_MAX_AGE_SECONDS`).
- **Logout** clears session and returns to `/login`.
- No public order/product pages without login.

### Out of scope

- Password on every page click within the same browser session.
- MFA.

Executable plan: `.planning/phases/07-session-security/01-PLAN.md`.

---

## Phase 08 (Production batch registry & dispatch assignment) — **complete**

### Workflow change (supersedes Nimra per-PO batch entry)

| Who | Before | After |
|-----|--------|-------|
| **Nimra** | Open each PO → enter batch per box + liters on that order | Register **prepared batch** once: batch no, product (Dishwash, Rhino, …), total liters |
| **Rashid** | Vehicle/driver/footer only | Assigns **which batch** fills each PO row on loading sheet; PO choice is his |
| **PO team** | Create orders | Unchanged |

### Nimra — production batch registry

- **`/production/batches`** — list + add prepared batches.
- Fields: **batch number**, **product** (catalog), **total liters**, date prepared.
- **No PO** selected at batch creation.

### Rashid — batch assignment on dispatch

- **`/orders`** → **Edit dispatch** (`?dispatch=1`) on loading sheet.
- Per box row: pick batch from pool (product must match row).
- Auto **Weight (L)**; reject if batch liters exceeded **across all POs**.
- Header/footer dispatch fields unchanged.

### Data

- New collection: **`ProductionBatch`**.
- `Order.sheetLines[].batchNo` + `weight` set by Rashid save (not Nimra).

Executable plans:
- `.planning/phases/08-production-batch-registry/01-PLAN.md`
- `.planning/phases/08-production-batch-registry/02-PLAN.md`

---

## Phase 09 (Multi-PO vehicle dispatch) — **complete**

### Problem

One truck often carries **multiple POs**. Rashid re-enters the same vehicle, driver, and DC for every PO today.

### Solution

- **`DispatchTrip`** — one record per vehicle load: dispatch fields + `orderIds[]`.
- Rashid **multi-selects POs** on a trip; save copies header/footer to each linked order (print unchanged).
- **Batch assignment** still per PO on each loading sheet (`?dispatch=1`).

### Rashid UI

- **`/dispatch/trips`** — list / create / edit trips.
- Trip page: pick POs, vehicle fields once, links to assign batches & print each sheet.

Executable plans:
- `.planning/phases/09-multi-po-vehicle-dispatch/01-PLAN.md`
- `.planning/phases/09-multi-po-vehicle-dispatch/02-PLAN.md`

---

## Phase 10 (Production batch QC fields) — **complete**

### Problem

Nimra records batch QC data in a spreadsheet (pH, solids, appearance, provider, drum, quantity). The app only stores batch no, product, liters, and optional notes — not enough to verify what was registered if feedback is wrong later.

Power Wash and Power Wash (pouch) are the same liquid; separate catalog packings should not require duplicate batches.

### Solution

- Add structured fields on **`ProductionBatch`**: ph, solids, appearance, provider, drum, quantity (+ existing batch no, product, date, totalLiters).
- **`ProductPacking.batchFamily`** — Nimra selects family; Rashid can assign that batch to any packing in the family.
- Batch **detail view** for audit / dispute lookup.

Executable plans:
- `.planning/phases/10-production-batch-qc-fields/01-PLAN.md`
- `.planning/phases/10-production-batch-qc-fields/02-PLAN.md`

---

## Phase 11 (Lock production batches for Nimra) — **complete**

### Problem

Nimra can still **edit** a production batch after Rashid has assigned it on a loading sheet. QC audit fields must not change post-dispatch. Fully **empty** (depleted) batches should show as **done**, not editable.

### Solution

- Lock edit/delete when `usedLiters > 0` (PATCH 403; UI hides actions).
- Status on Nimra list: **Available** | **In use (X L left)** | **Empty**.

Executable plans:
- `.planning/phases/11-lock-production-batches/01-PLAN.md`
- `.planning/phases/11-lock-production-batches/02-PLAN.md`

---

## Phase 12 (Admin pending orders summary) — **complete**

### Problem

Management (Waleed Intisar) tracks workload in a spreadsheet/PDF: pending POs with city, deadline, and **carton counts per product**. The app has no admin view.

### Solution

- Role **`admin`** — user **Waleed Intisar** (`waleed` / `Waleed-Admin-01`).
- **`/admin`** dashboard replicating the PDF grid: product columns, totals, **BUILTY DONE** for dispatched orders.
- Extend orders with **city** and **deadline date** on PO entry.

Executable plans:
- `.planning/phases/12-admin-pending-summary/01-PLAN.md`
- `.planning/phases/12-admin-pending-summary/02-PLAN.md`

---

## Phase 13 (Admin oversight) — **complete**

### Problem

Waleed has the pending-orders grid only. He cannot easily see **which PO team member created each order** or **browse Nimra’s production batch registry** and dispatch activity without direct URLs.

### Solution

- Expand **`admin`** read-only access: **Orders** (with **Entered by**), **Production batches** (list + QC detail), **Dispatch trips** (view only).
- Keep **Summary** at `/admin`; no PO/batch/dispatch **editing** for admin in v1.

Executable plans:
- `.planning/phases/13-admin-oversight/01-PLAN.md`
- `.planning/phases/13-admin-oversight/02-PLAN.md`

---

## Phase 14 (PO full-catalog quantity grid) — ✓ complete

### Problem

Adding products one-by-one with dropdowns is slow and error-prone. Orders usually include only **3–4** of **15–17** catalog SKUs.

### Solution

- Show **full product list** on `/new-order`; PO team enters **cartons** (and sample bottles/carton if needed).
- Save only lines with **cartons ≥ 1** → loading sheet gets those products only.

Executable plans:
- `.planning/phases/14-po-product-entry-table/01-PLAN.md`

---

## Phase 15 (Mixed sample box) — ✓ complete

### Problem

Sample orders ship **small bottle counts** for several products in **one physical box**. Today each product line becomes separate cartons on the loading sheet (e.g. 1 carton × 5 bottles + 1 carton × 2 bottles). Operations want **one box** containing both.

### Solution

- **Mixed sample box** mode on `/new-order`: enter **bottles per product** + **number of identical mixed boxes** (default 1).
- Loading sheet: **one row per physical mixed box**; batch assignment per product inside the mix (reuse bundle-style `componentBatches`).
- v1: whole order is either standard cartons **or** mixed sample (not both on one PO).

Executable plans:
- `.planning/phases/15-mixed-sample-box/01-PLAN.md`
- `.planning/phases/15-mixed-sample-box/02-PLAN.md`

---

## Phase 16 (Packaging inventory — Rashid) — **complete**

### Problem

Factory needs to track **empty packaging** (bottles, caps, stickers) on the shelf. Rashid should enter current quantities; later the system should deduct when bottles are filled or orders ship.

### Solution (v1)

- Dedicated route **`/dispatch/inventory`** for Rashid (`dispatch_editor`).
- Seeded **packaging item catalog** by category; Rashid updates **on-hand count** (physical count) with audit movements.
- Admin read-only oversight.

Executable plans:
- `.planning/phases/16-packaging-inventory/01-PLAN.md`
- `.planning/phases/16-packaging-inventory/02-PLAN.md`
- `.planning/phases/16-packaging-inventory/03-PLAN.md`

---

## Phase 17 (Rashid daily filling & waste) — **complete**

### Problem

Rashid fills bottles from Nimra’s batches and needs to record **daily fill**, **ready-to-deliver** stock, and **physical leftover** per batch. Operations want to **compare** those numbers to **Nimra’s remaining liters** (batch total minus loading-sheet allocation) to see **waste / variance**.

### Solution (v1)

- Route **`/dispatch/filling`** — spreadsheet: Nimra remaining (read-only) + Rashid’s three liter fields + variance column.
- `BatchFillingDailyEntry` per batch per date; PATCH on row save.
- Variance = system remaining − physical remaining (confirm with ops at UAT).

Executable plans:
- `.planning/phases/17-rashid-daily-filling-waste/01-PLAN.md`
- `.planning/phases/17-rashid-daily-filling-waste/02-PLAN.md`
- `.planning/phases/17-rashid-daily-filling-waste/03-PLAN.md`

---

## Phase 18 (Admin order edit — boss only) — **complete**

### Problem

When a product has an issue or a customer wants changes, only **management (Waleed)** should correct the PO. PO team should not edit orders after creation.

### Solution (v1)

- **`admin` only:** `PATCH /api/orders/[id]` and `/orders/[id]/edit`
- Edit header + product quantities (standard + mixed sample); rebuild loading sheet
- Preserve batch assignments on matching rows where possible

### Future (Phase 19)

- Auto-deduct packaging when filling/dispatching; BOM link to product packings.

---

## Phase 19 (Packaging auto-deduct) — **planned**

See `.planning/ROADMAP.md` — implementation plans TBD when executed.

---

## Phase 20 (Nimra add catalog product) — **complete**

### Problem

New factory SKUs are not in `ProductPacking` until someone edits JSON and runs seed.

### Solution (v1)

- Nimra POST new packing + **Add product** UI on production batches.

Executable plans:
- `.planning/phases/20-nimra-add-product/01-PLAN.md`
- `.planning/phases/20-nimra-add-product/02-PLAN.md`
- `.planning/phases/20-nimra-add-product/03-PLAN.md`

---

## Phase 21 (Gate guard — Zaman) — **complete**

### Who

| Display name | Username | Role | Initial password |
|--------------|----------|------|------------------|
| Zaman | `zaman` | `gate_guard` | `Zaman-Guard-01` |

### Problem

Dispatch assigns vehicles and trips, but there is **no system record** of when goods **left the gate**, when they were **delivered**, or when they **came back** for a later attempt.

### Solution (v1)

- **`gate_guard`** role: home **`/gate/orders`**; only this role (v1) edits gate status.
- **`Order`** fields: `gateDeliveryStatus` — `none` | `out_for_delivery` | `delivered` | `pending_redelivery`; timestamps + audit (`gateUpdatedAt`, `gateUpdatedByName`, …).
- **APIs:** `GET /api/gate/orders` (eligible orders), `PATCH /api/orders/[id]/gate-delivery` with **validated transitions** (see `21-RESEARCH.md`).
- **UI:** simple list + actions; label **Pending redelivery** (not “pending order”) to avoid confusion with admin pending POs.

Executable plans:
- `.planning/phases/21-gate-guard-zaman/01-PLAN.md`
- `.planning/phases/21-gate-guard-zaman/02-PLAN.md`
- `.planning/phases/21-gate-guard-zaman/03-PLAN.md`

---

## Phase 22 (Hybrid PO — standard + custom cartons) — **complete** ✓

### Problem

Orders like **AMIR STORE** need **many standard carton lines** (Rhino 250/500/750, Degrease, …) **and** a few **custom physical cartons** where several SKUs are packed **in one box** (e.g. Power Wash Pouch + Brighten + Fabrito). The app today forces **either** full **standard** **or** full **mixed sample** (`orderKind`), not both on one PO.

### Solution (v1)

- **Single PO flow:** standard `items[]` plus optional **`customCartons[]`**; merged **`sheetLines`** = standard rows + `mixed_sample`-style rows per custom definition, global **`boxNo`**.
- **UI:** **Add custom carton** (Create box) builder + existing standard grid; optional legacy path for old “mixed only” orders.

Executable plans:
- `.planning/phases/22-hybrid-order-custom-boxes/01-PLAN.md`
- `.planning/phases/22-hybrid-order-custom-boxes/02-PLAN.md`
- `.planning/phases/22-hybrid-order-custom-boxes/03-PLAN.md`

