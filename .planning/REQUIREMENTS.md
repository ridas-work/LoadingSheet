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

## Phase 06 (Dispatch — Rashid) — **planned**

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

