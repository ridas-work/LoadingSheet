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

## Phase 06: Dispatch / Delivery Assignment
Add dispatch workflow to assign delivery details (which PO(s) going out, driver/rider, helper, vehicle) and finalize/lock records.
