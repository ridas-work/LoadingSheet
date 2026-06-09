# Project State

Phase: **25 complete** ✓ — Packaging quantity balance — `.planning/phases/25-packaging-quantity-balance/`  
Phase: **24 complete** ✓ — Field visit tickets (Nouman & Javeria) + 2-week follow-up reminder — `.planning/phases/24-field-visit-sample-tickets/`  
Phase: **19 complete** ✓ — Haider packaging inventory + delivery auto-deduct  
Phase: **20 complete** ✓ — Nimra add catalog product  
Phase: **21 complete** ✓ — Gate guard Zaman  
Phase: **22 complete** ✓ — Hybrid PO  
Phase: **23 complete** ✓ — Rashid bottle filling  
Status: Phase **26 complete** ✓ — Ready bottle stock ledger  
Phase **27 complete** ✓ — Legacy orphan batch ready stock  
Phase **28 complete** ✓ — Custom carton box sizes (5L / 1L / 500ml / 250ml / 100ml)

Phase **29 complete** ✓ — Hide gate-completed orders from Rashid queue

## Next planned
- **Phase 30** — Standard carton weight check (Rashid manual kg vs factory list ±8%) — `.planning/phases/30-standard-carton-weight-check/`

## Recent product / QC updates
- **Viscosity** optional field on production batches for **Rhino, Brighten, Power Wash, and Hand Sanitizer** batch families (not only Rhino).
- **Hand Sanitizer** added to `data/product-packings.json` — run `npm run seed:products` to load into DB.

## Next
- Execute Phase 30: Rashid enters carton kg; validate vs standard weight list
- UAT Phase 29: Rashid `/orders` hides delivered POs; admin still sees all
- UAT Phase 26+27: Rashid legacy lot (batch not in Nimra) → Zaman **Delivered** deduct (`/dispatch/filling`)
- UAT packaging balance: Haider purchased → Rashid fill → Zaman deliver (`/dispatch/inventory/movements`)
