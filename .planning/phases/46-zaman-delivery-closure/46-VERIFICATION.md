# Phase 46 Verification

**Status:** `human_needed` (code complete; UAT on live gate flow recommended)

## Must-haves checked (code)

| Item | Status |
|------|--------|
| Order stores closure + late return fields | ✓ |
| Close delivery: full / partial per product | ✓ |
| Partial: delivered + damaged + returned = dispatched | ✓ |
| Good returned → Rashid ready stock | ✓ |
| Damaged → write-off (no stock credit) | ✓ |
| Late return on old delivered POs, no qty cap | ✓ |
| Admin table PO \| product \| delivered \| damaged \| returned | ✓ |
| `npm run build` | ✓ |

## Human UAT
- [ ] Zaman: close full delivery on out-for-delivery PO
- [ ] Zaman: partial close with returned bottles → verify Rashid ready stock
- [ ] Zaman: late return on 2+ month old delivered PO with qty > original dispatch
- [ ] Waleed: delivery summary closure table totals
