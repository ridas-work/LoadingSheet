# Roadmap

## Phase 01: Authorized PO Entry
Build authentication + role-gated PO creation so 4 authorized users can log in and create orders (PO, customer, product, bottles). Store in MongoDB with created-by attribution.

## Phase 02: Production Updates & Loading Sheet
Extend PO lines into **box rows** using an agreed rule (total bottles vs cartons). Generate a **print-ready loading sheet** after PO save (batch + weight empty until production fills them). Then production workflow appends batch number + weight per row with validation and status transitions.

**Also shipped:** Product **packing catalog** (default bottles per carton) + **per-line override** for samples.

## Phase 03: Order portal access (4 authorized users)
Restore **login-only** access (no signup): Nouman, Javeria, Aslam, Ibtisam with seeded usernames/passwords; protect `/new-order` and `/orders/*`; attribute orders to the signed-in user.

## Phase 04: Production batch entry (Nimra) ✓
Role **`batch_editor`** for Nimra: login, list orders, enter **batch number per box row** on `sheetLines`; API + UI; loading sheet prints filled batches. PO creators cannot create orders as Nimra; Nimra cannot create POs.

**Follow-up (plan 02):** ✓ Shared **`/orders`** list + universal loading sheet view; Nimra edits batches on the sheet (edit mode).

## Phase 05: Batch volume & weight validation ✓
Nimra records **total liters per batch**; system **auto-fills row Weight** from `bottlesPerBox × litersPerBottle`; **rejects** assignments that exceed batch size; shows **used/remaining** on screen (not on print). Stickers may be kg; operations use **liters**.

## Phase 06: Dispatch / Delivery Assignment (Rashid) ✓
Role **`dispatch_editor`** for **Rashid**: login (`rashid`), fill loading-sheet **Vehicle, Driver, DC No, Helper**, footer **Production Incharge, Security, Driver**; view/print for all. No PO or batch editing.

Executable plan: `.planning/phases/06-dispatch-assignment/01-PLAN.md`.

## Phase 07: Session security & mandatory login ✓
**Login required for every browser session.** Global middleware; session cookie expires when the browser closes (no 30-day persistent login). JWT capped to one work shift (default 8h) while the browser stays open.

Executable plan: `.planning/phases/07-session-security/01-PLAN.md`.

## Phase 08: Production batch registry & dispatch assignment ✓
**Workflow change:** Nimra registers **prepared batches** (batch no + product + liters) **without picking a PO**. Rashid assigns batches from that pool to each PO on the loading sheet when dispatching.

Executable plans:
- `.planning/phases/08-production-batch-registry/01-PLAN.md` — Nimra batch registry
- `.planning/phases/08-production-batch-registry/02-PLAN.md` — Rashid batch-to-PO assignment

## Phase 09: Multi-PO vehicle dispatch ✓
One **vehicle / trip** can carry **multiple POs**. Rashid creates a **dispatch trip**, selects several orders, enters vehicle & driver **once**; system syncs header/footer to each PO's loading sheet. Batch assignment stays per PO.

Executable plans:
- `.planning/phases/09-multi-po-vehicle-dispatch/01-PLAN.md` — DispatchTrip model + API
- `.planning/phases/09-multi-po-vehicle-dispatch/02-PLAN.md` — Rashid trip UI + orders integration

## Phase 10: Production batch QC fields ✓
Nimra's batch registry gains **structured QC/logistics fields** (pH, solids, appearance, provider, drum, quantity, product, date) stored for **future feedback audit**. **Product batch families** — e.g. one **Power Wash** batch covers both Power Wash and Power Wash (pouch) packings on POs.

Executable plans:
- `.planning/phases/10-production-batch-qc-fields/01-PLAN.md` — schema, API, product families
- `.planning/phases/10-production-batch-qc-fields/02-PLAN.md` — Nimra form, list, detail view

## Phase 11: Lock production batches for Nimra ✓
Once Rashid assigns a batch on a loading sheet, Nimra **cannot edit or delete** it (QC audit preserved). List shows **Available / In use / Empty** so depleted batches are clearly **done**, not open for edit.

Executable plans:
- `.planning/phases/11-lock-production-batches/01-PLAN.md` — usage helper + PATCH lock API
- `.planning/phases/11-lock-production-batches/02-PLAN.md` — Nimra status UI + hide edit when locked

## Phase 12: Admin pending orders summary ✓
**Admin panel** (`admin` role) for **Waleed Intisar**: login and view a **PDF-style pending orders grid** — customer, city, deadline, PO no, carton counts per product column, row/column/grand totals, **BUILTY DONE** when dispatched on a vehicle trip.

Executable plans:
- `.planning/phases/12-admin-pending-summary/01-PLAN.md` — admin role, Waleed Intisar seed, order city/deadline, summary labels
- `.planning/phases/12-admin-pending-summary/02-PLAN.md` — summary API + admin dashboard UI

## Phase 13: Admin oversight (boss expanded access) ✓
**Waleed Intisar** gets **read-only oversight** across the app: pending orders summary plus **who entered each PO**, **what Nimra registered** (production batches + QC detail), and **dispatch trips** — without edit rights on POs, batches, or dispatch.

Executable plans:
- `.planning/phases/13-admin-oversight/01-PLAN.md` — admin route access + layout/API guards
- `.planning/phases/13-admin-oversight/02-PLAN.md` — nav, orders creator column, read-only batch & dispatch UI

## Phase 14: PO full-catalog quantity grid — **planned**
PO team (**Nouman, Javeria, Aslam, Ibtisam**) see **all ~17 products in one list** on `/new-order` and only enter **carton counts** (typical order: 3–4 products). Rows left at zero are omitted; only filled products go to the loading sheet.

Executable plans:
- `.planning/phases/14-po-product-entry-table/01-PLAN.md` — full catalog grid + new-order integration
