# Roadmap (excerpt — active phases)

## Phase 38: Chemical raw materials — Ramazan requests ✓
Ramazan (`chemicals_editor`) views catalog, requests re-order. Waleed approves at `/admin/chemical-requests`. Stock now updated by Esha intake (Phase 44), not Ramazan manual edit.

## Phase 43: Esha close batch + waste ✓
Esha closes approved production batches with waste liters; archive at `/production/batches/closed`.

## Phase 44: Esha chemical QC intake + approve deduct ✓
**Esha** QC-checks incoming chemicals at `/production/chemical-intake` (search existing or **add new name** to catalog). Successful intake increases stock in **Ramazan's portal**. **Ramazan** requests read-only; **Waleed** approves → stock **deducts**. Approve **blocked** when on hand &lt; requested until Esha intake or Waleed stock adjust.

Executable plans:
- `.planning/phases/44-esha-chemical-qc-intake/44-RESEARCH.md`
- `.planning/phases/44-esha-chemical-qc-intake/01-PLAN.md` — schema, stock ledger, roles
- `.planning/phases/44-esha-chemical-qc-intake/02-PLAN.md` — intake API + approve deduct
- `.planning/phases/44-esha-chemical-qc-intake/03-PLAN.md` — Esha UI, Ramazan read-only, Waleed shortage UI
- `.planning/phases/44-esha-chemical-qc-intake/44-VERIFICATION.md`

## Phase 45: Print timestamp, Ali trip control, and chemical accessories ✓
Loading sheets should print the live day/time when printed. Ali is the only dispatch user allowed to create, edit, or discard vehicle trips; Rashid keeps batch/weight/filling work only. Esha tracks stock for shoppers, drums, and seals. Ramazan can optionally request those accessories alongside a chemical request, and Waleed approval is blocked when either chemical stock or requested accessory stock is below the requested requirement.

Executable plans:
- `.planning/phases/45-print-trip-accessory-stock/01-PLAN.md` — loading-sheet print timestamp
- `.planning/phases/45-print-trip-accessory-stock/02-PLAN.md` — Ali-only trip create/edit/discard authority
- `.planning/phases/45-print-trip-accessory-stock/03-PLAN.md` — accessory stock/request schema and approval guards
- `.planning/phases/45-print-trip-accessory-stock/04-PLAN.md` — Esha/Ramazan/Waleed accessory UI

## Phase 39: Glim bulk fill (planned)
No production batch on loading sheet for Glim bulk lines.

## Phase 46: Zaman delivery closure — full / partial returns ✓
When **Zaman** marks a PO **delivered**, he also **closes** the order in the same step. He chooses **fully delivered** (permanent close) or **partially delivered**. For partial closure he enters per-product bottle counts: **delivered to customer**, **damaged** (write-off / fail), and **returned good** (restored to Rashid ready-bottle stock). **Late return** on already-delivered POs allows bottles from months ago with **no limit** on quantity. Admin/Waleed see a summary table: PO | product | delivered | damaged | returned.

Executable plans:
- `.planning/phases/46-zaman-delivery-closure/46-RESEARCH.md`
- `.planning/phases/46-zaman-delivery-closure/01-PLAN.md` — closure schema, validation, gate status rules
- `.planning/phases/46-zaman-delivery-closure/02-PLAN.md` — partial stock movements (delivered deduct, good return restore, damaged write-off)
- `.planning/phases/46-zaman-delivery-closure/03-PLAN.md` — gate-delivery API + Zaman close-delivery UI + late return
- `.planning/phases/46-zaman-delivery-closure/04-PLAN.md` — delivery closure summary table for admin reports
- `.planning/phases/46-zaman-delivery-closure/46-VERIFICATION.md`

## Phase 47: Sample order dispatch pipeline (complete)
After Waleed approves an **outgoing** field visit sample (Nouman / Javeria / Aslam / Ahtisham), a **sample order** is created — separate from regular POs. **Rashid** assigns batches at **`/dispatch/sample-orders`** from **Esha sample production** only; stock **deducts on batch assign**. **Ali** builds **sample trips** at **`/dispatch/sample-trips`** (not mixed with regular PO trips). Sample orders then flow to **Zaman's gate** like regular orders (close/partial/late return unchanged; no ready-stock/packaging deduction since samples draw from Esha's pool).

Executable plans:
- `.planning/phases/47-sample-order-dispatch-pipeline/47-RESEARCH.md`
- `.planning/phases/47-sample-order-dispatch-pipeline/01-PLAN.md` — schema: field_sample order, sample tripKind
- `.planning/phases/47-sample-order-dispatch-pipeline/02-PLAN.md` — Waleed approve → sample order; remove request-time deduct
- `.planning/phases/47-sample-order-dispatch-pipeline/03-PLAN.md` — Rashid `/dispatch/sample-orders` + sample batch assign + deduct
- `.planning/phases/47-sample-order-dispatch-pipeline/04-PLAN.md` — Ali `/dispatch/sample-trips` separate from regular trips

## Phase 48: Customer account opening (complete)
New login **`account_opener`** for registering customers before POs. Form: **company name**, **filer / non-filer** (NTN + STRN if filer), **contract / non-contract** (description if contract), **address**, **city**, **contact person**, **designation**, **email**, **phone**, optional notes. On save, customer **auto-joins** the directory used by **Nouman / Javeria / Aslam / Ahtisham** PO customer picker and field visits.

Executable plans:
- `.planning/phases/48-customer-account-opening/48-RESEARCH.md`
- `.planning/phases/48-customer-account-opening/01-PLAN.md` — role, CustomerAccount schema, validation
- `.planning/phases/48-customer-account-opening/02-PLAN.md` — APIs + directory sync on create
- `.planning/phases/48-customer-account-opening/03-PLAN.md` — account opener UI + nav
- `.planning/phases/48-customer-account-opening/04-PLAN.md` — PO + field visit customer dropdown

## Phase 49: Portal illustrations & colorful UI (complete)
Add four user-supplied vector illustrations to role-specific portals and refresh the frontend with a more colorful, welcoming layout.

| Illustration | Portal | Route shell |
|--------------|--------|-------------|
| Rejuvinitals truck / warehouse | **Rashid** | `/dispatch/*` |
| Girl at desk “Waleed Tech Stock” | **Esha** | `/production/*` |
| “READY STOCK” warehouse | **Ali** | `/orders/*` |
| Waleed Tech logo composite | **Signup** | `/signup` |

Executable plans:
- `.planning/phases/49-portal-illustrations-ui/49-RESEARCH.md`
- `.planning/phases/49-portal-illustrations-ui/01-PLAN.md` — assets + PortalHero component
- `.planning/phases/49-portal-illustrations-ui/02-PLAN.md` — Rashid / Esha / Ali layout heroes
- `.planning/phases/49-portal-illustrations-ui/03-PLAN.md` — signup branded page
- `.planning/phases/49-portal-illustrations-ui/04-PLAN.md` — global color polish + login harmony

## Phase 50: Market visit form (Ahtisham & Aslam) ✓
**Ahtisham** and **Aslam** do not run sales meetings or sample collections. Their **Field visits** portal uses a **Market Visit Form** matching the paper template: per-store **availability (Y/N)** and **facing display (units)** across a fixed 14-SKU grid (Washout, Rhino, Fabrito, Brighten, Power Wash, Degreaser, Titan), plus footer remarks. **Nouman** and **Javeria** keep the existing sample/meeting field visit workflow unchanged.

Executable plans:
- `.planning/phases/50-market-visit-form-ahtisham-aslam/50-RESEARCH.md`
- `.planning/phases/50-market-visit-form-ahtisham-aslam/01-PLAN.md` — schema, SKU catalog, visitKind discriminator
- `.planning/phases/50-market-visit-form-ahtisham-aslam/02-PLAN.md` — API create/update; block sample actions on market visits
- `.planning/phases/50-market-visit-form-ahtisham-aslam/03-PLAN.md` — MarketVisitForm UI + print layout
- `.planning/phases/50-market-visit-form-ahtisham-aslam/04-PLAN.md` — routing, list copy, admin view, regression checks

## Phase 51: Custom carton outer box picker ✓
When **Nouman, Javeria, Aslam, Ahtisham**, or **Waleed** build a **custom carton** on a PO, they must pick **which outer shipping box** Haider deducts on delivery (`custom-box-5l-jar`, `custom-box-1l`, `custom-box-500ml`, `custom-box-250ml`, `custom-box-100ml`). Inner BOM (bottle, cap, sticker per product) already works; this phase completes the missing **outer box** picker UI and makes `customBoxCode` required so gate delivery deducts the selected box — not a product-family carton.

Executable plans:
- `.planning/phases/51-custom-box-outer-packaging-picker/51-RESEARCH.md`
- `.planning/phases/51-custom-box-outer-packaging-picker/01-PLAN.md` — require `customBoxCode` server-side + packaging seed
- `.planning/phases/51-custom-box-outer-packaging-picker/02-PLAN.md` — `CustomCartonBuilder` outer box select + `/new-order` validation
- `.planning/phases/51-custom-box-outer-packaging-picker/03-PLAN.md` — admin edit, legacy banner, PO detail display
- `.planning/phases/51-custom-box-outer-packaging-picker/04-PLAN.md` — gate deduction verification + UAT
- `.planning/phases/51-custom-box-outer-packaging-picker/51-VERIFICATION.md`

## Phase 52: Unified Esha batch form ✓
**Esha** should not choose **Standard products** vs **Custom box / drums** before picking a product. Combine both product lists into **one dropdown** (Rhino, Brighten, Fabrito, Power Wash, Degrease, Hand Sanitizer, Sequester, GLIM, etc.). Use a **single form** with combined fields — drum, customer, HCL, viscosity shown or optional based on **product**, not batch type. **Regular production** vs **Sample production** stays. Goal: simpler batch entry for Esha and easier batch assignment for Rashid on loading sheets.

Executable plans:
- `.planning/phases/52-unified-esha-batch-form/52-RESEARCH.md`
- `.planning/phases/52-unified-esha-batch-form/01-PLAN.md` — unified resolver, infer `batchKind`, optional drum
- `.planning/phases/52-unified-esha-batch-form/02-PLAN.md` — remove type toggle; one optgroup dropdown; combined fields
- `.planning/phases/52-unified-esha-batch-form/03-PLAN.md` — batch list/detail/edit alignment
- `.planning/phases/52-unified-esha-batch-form/04-PLAN.md` — Rashid assignment verification + UAT
- `.planning/phases/52-unified-esha-batch-form/52-VERIFICATION.md`

## Phase 53: Market visit N alerts (Aslam & Ahtisham) ✓

When a rep marks a SKU **N** on the market visit availability grid, that cell is **red**. Open **N** alerts persist per **store + SKU** across future visits until the rep marks **Y** on a later form.

Executable plans:
- `.planning/phases/53-market-visit-no-alerts/53-RESEARCH.md`
- `.planning/phases/53-market-visit-no-alerts/01-PLAN.md` — `MarketVisitStoreAlert` schema + sync helpers
- `.planning/phases/53-market-visit-no-alerts/02-PLAN.md` — alerts API + sync on save/submit
- `.planning/phases/53-market-visit-no-alerts/03-PLAN.md` — red cell UI + cross-visit fetch
- `.planning/phases/53-market-visit-no-alerts/04-PLAN.md` — verification + regression
- `.planning/phases/53-market-visit-no-alerts/53-VERIFICATION.md`
