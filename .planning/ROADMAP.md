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

## Phase 39: Glim bulk fill (planned)
No production batch on loading sheet for Glim bulk lines.
