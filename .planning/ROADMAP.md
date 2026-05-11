# Roadmap

## Phase 01: Authorized PO Entry
Build authentication + role-gated PO creation so 4 authorized users can log in and create orders (PO, customer, product, bottles). Store in MongoDB with created-by attribution.

## Phase 02: Production Updates
Add production workflow to append batch number + weight per product line item, with validation and status transitions.

## Phase 03: Dispatch / Delivery Assignment
Add dispatch workflow to assign delivery details (which PO(s) going out, driver/rider, helper, vehicle) and finalize/lock records.

