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
Nimra's batch registry gains **structured QC/logistics fields** (pH, solids, appearance, provider, HCL, quantity, product, date) stored for **future feedback audit**. **Viscosity** is optional for **Rhino, Brighten, Power Wash, and Hand Sanitizer** batch families. **Product batch families** — e.g. one **Power Wash** batch covers both Power Wash and Power Wash (pouch) packings on POs.

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

## Phase 14: PO full-catalog quantity grid ✓
PO team (**Nouman, Javeria, Aslam, Ibtisam**) see **all catalog products in one list** on `/new-order` and only enter **carton counts** (typical order: 3–4 products). Rows left at zero are omitted; only filled products go to the loading sheet. Per-row **Sample / custom** toggle for non-standard bottles/carton; optional **Other** row for catalog-misses.

Executable plans:
- `.planning/phases/14-po-product-entry-table/01-PLAN.md` — full catalog grid + new-order integration

## Phase 15: Mixed sample box (one carton, many products) ✓
Sample orders often need **partial bottle counts** across several SKUs (e.g. 5 bottles of one product + 2 of another) shipped in **one physical box**, not as separate cartons. PO team toggles **Mixed sample box** on `/new-order`, enters **bottles per product** and **how many identical mixed boxes** to ship; loading sheet gets **one row per physical box** with **per-product batch picks** (like bundles).

Executable plans:
- `.planning/phases/15-mixed-sample-box/01-PLAN.md` — schema, build lines, batch validation
- `.planning/phases/15-mixed-sample-box/02-PLAN.md` — new-order UI, loading sheet, admin summary

## Phase 16: Packaging inventory (Rashid) ✓
**Rashid** maintains on-hand counts for **packaging materials** — bottles, caps, stickers, labels — on **`/dispatch/inventory`**, separate from dispatch trips and production batches. Physical **stock count** updates with audit log. Catalog seeded from JSON (v1: dev adds new item types; Rashid updates quantities only). Admin read-only.

Executable plans:
- `.planning/phases/16-packaging-inventory/01-PLAN.md` — models, seed, API
- `.planning/phases/16-packaging-inventory/02-PLAN.md` — inventory UI + nav
- `.planning/phases/16-packaging-inventory/03-PLAN.md` — future auto-deduct hook (schema stub + Phase 17 roadmap)

## Phase 17: Rashid daily filling & waste reconciliation ✓
**Rashid** logs **per production batch, per day**: liters **filled today**, **ready to deliver**, and **physical remaining** in the batch. The app shows **Nimra’s system remaining** (`totalLiters − liters on loading sheets`) beside Rashid’s numbers and computes **variance / waste** so operations can reconcile spillage and unlogged usage.

Executable plans:
- `.planning/phases/17-rashid-daily-filling-waste/01-PLAN.md` — model, waste math, API
- `.planning/phases/17-rashid-daily-filling-waste/02-PLAN.md` — `/dispatch/filling` inline grid + nav
- `.planning/phases/17-rashid-daily-filling-waste/03-PLAN.md` — admin visibility + Phase 18 stub

## Phase 18: Admin order edit (boss only) ✓
**Waleed Intisar (admin)** can **edit existing POs** — customer, deadline, product lines, carton counts, mixed-sample contents — when material issues or customer changes require corrections. PO creators still **create only**; Nimra/Rashid keep their own scoped edits. Rebuilds loading-sheet rows; preserves batch assignments where rows still match.

Executable plans:
- `.planning/phases/18-admin-order-edit/01-PLAN.md` — `canEditOrders`, PATCH API, preserve batches
- `.planning/phases/18-admin-order-edit/02-PLAN.md` — `/orders/[id]/edit` UI + list link
- `.planning/phases/18-admin-order-edit/03-PLAN.md` — docs + Phase 19 stub

## Phase 19: Haider packaging inventory + delivery auto-deduct ✓
Move **packaging inventory** ownership from Rashid to **Haider** (`packaging_editor`): Haider maintains bottles, caps, stickers/labels, cartons/boxes, pouches, and related materials. When Zaman marks an order **Delivered**, the app automatically deducts packaging from inventory using the order’s actual loading-sheet rows and product packing metadata: **bottles/stickers/caps by bottle count**, and **cartons/boxes by `ProductPacking.bottlesPerCarton`** (e.g. Rhino 250ml has **20 bottles per carton**, so carton usage follows shipped bottle count / 20). Deductions must be audited, idempotent, and visible to admin.

Executable plans:
- `.planning/phases/19-haider-packaging-auto-deduct/01-PLAN.md` — Haider role/user and packaging inventory access ownership
- `.planning/phases/19-haider-packaging-auto-deduct/02-PLAN.md` — packaging BOM resolver from order lines, product packings, and packaging item links
- `.planning/phases/19-haider-packaging-auto-deduct/03-PLAN.md` — gate-delivered auto-deduct, audit/idempotency, docs

## Phase 24: Field visit tickets — Nouman & Javeria sample-to-order — **complete**
**Nouman** and **Javeria** visit customers, **request samples**, and track each visit as a **ticket**. They record sample delivery, customer feedback (liked / not), and **conclude** the visit. The ticket stays open until a **PO is placed** from that customer: **confirmed order → positive points and link to PO**; **no order / lost deal → negative points** and ticket closed. Other PO creators (Aslam, Ibtisam) are not in this workflow in v1.

Executable plans:
- `.planning/phases/24-field-visit-sample-tickets/01-PLAN.md` — `FieldVisitTicket` model, APIs, order `visitTicketId` linkage and auto-close on order
- `.planning/phases/24-field-visit-sample-tickets/02-PLAN.md` — `/field-visits` UI for Nouman/Javeria, new-order prefill/link
- `.planning/phases/24-field-visit-sample-tickets/03-PLAN.md` — admin read-only visit list + rep points, README

## Phase 25: Packaging quantity balance — purchased, UIP, delivered — **complete**
**Haider** records **purchased** packaging and **rejected/damaged** on his inventory portal; **balance** = purchased − rejected − **UIP** (Used In Production). **Rashid** daily filling automatically moves **filled bottles** (and caps) into UIP. When **Zaman** marks an order **Delivered**, **bottles, stickers, and cartons** from that PO’s loading sheet increase UIP so remaining stock is the true balance.

Executable plans:
- `.planning/phases/25-packaging-quantity-balance/01-PLAN.md` — Haider ledger: purchased + rejected only; UIP/balance read-only
- `.planning/phases/25-packaging-quantity-balance/02-PLAN.md` — Rashid filling → auto UIP (delta, idempotent)
- `.planning/phases/25-packaging-quantity-balance/03-PLAN.md` — Zaman delivered deduct, movements audit, README

## Phase 20: Nimra add catalog product ✓
**Nimra** can register **new sellable packings** (product name, code, batch family, bottles per carton, liters per bottle) from the production portal when the factory prepares a SKU not yet in the master list — so new-order and batch registry stay in sync without a developer-only seed step.

Executable plans:
- `.planning/phases/20-nimra-add-product/01-PLAN.md` — `POST /api/product-packings` (batch_editor only), validation, unique code
- `.planning/phases/20-nimra-add-product/02-PLAN.md` — **Add product** UI on `/production/batches` (or batch new page), success feedback
- `.planning/phases/20-nimra-add-product/03-PLAN.md` — README + optional admin read-only list note

## Phase 21: Gate guard (Zaman) — delivery confirmation ✓
**Zaman** (`gate_guard`) at the gate marks each order **Out for delivery** when the vehicle leaves, **Delivered** when the customer has received the goods, or **Pending redelivery** when goods return on the vehicle for a later run. Seeded login **`zaman` / `Zaman-Guard-01`**. State lives on **Order** with audited transitions; list shows trip-linked / dispatch-ready orders.

Executable plans:
- `.planning/phases/21-gate-guard-zaman/01-PLAN.md` — `Order` gate fields, `gate_guard` role + seed, `GET /api/gate/orders`, `PATCH /api/orders/[id]/gate-delivery`
- `.planning/phases/21-gate-guard-zaman/02-PLAN.md` — `/gate/orders` UI, nav, cross-role redirects
- `.planning/phases/21-gate-guard-zaman/03-PLAN.md` — README + STATE note for Zaman workflow

## Phase 22: Hybrid PO — standard cartons + custom multi-product boxes ✓
**One order** can combine **normal carton lines** (each SKU × N cartons, Rule B) with **one or more custom cartons** where the PO team defines **several catalog products and bottle counts inside the same physical box** (e.g. Power Wash Pouch + Brighten + Fabrito in one carton), without forcing the whole PO to be “mixed sample only”. Unifies today’s split between **`orderKind: standard`** and **`mixed_sample`** into a single flexible flow (e.g. **Add custom carton** / **Create box** builder + standard grid).

Executable plans:
- `.planning/phases/22-hybrid-order-custom-boxes/01-PLAN.md` — order payload + `sheetLines` builder (merge standard + custom lines, `boxNo`, `lineKind`), API validation, migration notes
- `.planning/phases/22-hybrid-order-custom-boxes/02-PLAN.md` — `/new-order` UI: standard table + custom carton section (repeatable), preview row count
- `.planning/phases/22-hybrid-order-custom-boxes/03-PLAN.md` — admin order edit, loading-sheet labels, README, regression checklist (batch assign, weight, dispatch)

## Phase 23: Rashid daily filling — bottle counts + ready stock ✓
Rashid’s daily filling screen should match factory work: he records **how many bottles were filled today** and **how many bottles are fully ready to deliver** (capped, labeled/stickered, packed/finished), instead of entering those operational counts as liters. The system still keeps **liter snapshots** internally by resolving the filled packing’s `litersPerBottle`, so variance against Nimra’s batch liters remains possible. Batches that can fill multiple pack sizes need a **packing selector** per line to avoid wrong liter conversion.

Executable plans:
- `.planning/phases/23-rashid-bottle-filling-readiness/01-PLAN.md` — data/API conversion from bottle entries to liter snapshots; support one or more packing lines per batch/day
- `.planning/phases/23-rashid-bottle-filling-readiness/02-PLAN.md` — `/dispatch/filling` UI wording and admin read-only display for bottle-based daily filling
