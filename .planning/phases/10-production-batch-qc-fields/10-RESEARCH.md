# Phase 10 Research — Production batch QC fields

## Stakeholder input

Nimra currently tracks batches in a spreadsheet (example: INNOWET DP-L) with columns:

| Column | Example values | Notes |
|--------|----------------|-------|
| Product | INNOWET DP-L | Catalog name |
| Date | 8/7/2025, 26/01/2026 | Batch prep date |
| Batch# | 250708, 250728-1 | Unique per batch |
| pH | 7, 6.5-7 | Often a target range in header |
| Solids | 30, 29-30% (sinking 17) | Free text + % |
| Appearance | Clear liquid, Hazy | QC observation |
| Provider | Ramzan | Supplier |
| Drum | 1*150, 6 * 150 | Packaging config |
| Quantity | 150 KG, 450L, 900 | Mixed units |

**Goal:** Persist exactly what Nimra enters so future complaints can be checked against the recorded batch record.

## Current app gap

`ProductionBatch` today: `batchNo`, `productName`, `totalLiters`, `preparedAt`, `notes`.

Missing QC/logistics fields. `notes` is unstructured — replace with structured fields.

## Product family (Power Wash)

Catalog has separate packings:

- `Power Wash` (carton 10)
- `Power Wash (pouch)` (carton 20)

Operations treat these as **one production batch** — same liquid, different packings on PO lines.

**Approach:** Add `batchFamily` on `ProductPacking` (seed + Mongo). Nimra picks **family** in dropdown. `productsMatch()` compares family keys so Rashid can assign a `Power Wash` batch to either packing on a PO.

Initial families to seed:

| batchFamily | catalog names |
|-------------|---------------|
| Power Wash | Power Wash, Power Wash (pouch) |
| (default) | each other product → family = its own `name` |

Extend later for Fabrito pouch, Brighten pouch, etc. using same pattern.

## totalLiters vs quantity

Dispatch pool and liter validation (Phase 05/08) require a **numeric liter total** per batch.

- **`quantity`** — string, Nimra-facing, matches spreadsheet habit (`750kg`, `450L`, `900`).
- **`totalLiters`** — number, powers Rashid remaining-liters math. Keep required in API; UI labels clearly. Optional helper: if `quantity` ends with `L`/`l`, suggest parsing.

## Out of scope

- Customer column from spreadsheet (PO-specific, not batch registry).
- Sr. number (UI row index only).
- Changing loading sheet print layout for QC fields (audit via batch list/detail only).
