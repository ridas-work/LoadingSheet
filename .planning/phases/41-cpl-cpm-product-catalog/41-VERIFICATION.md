# Phase 41 Verification — CPL & CPM product catalog

**Status:** PASSED  
**Verified:** 2026-06-30

## Must-haves

| Check | Result |
|-------|--------|
| 4 product packings in JSON + Mongo seed | ✓ |
| 15 packaging SKUs in catalog | ✓ |
| 4 BOM entries with shared components | ✓ |
| Reorder thresholds (shared pools + labels) | ✓ |
| Rashid plan product tasks (4 products) | ✓ |
| Standard weights 4.5 kg (55 ml), 3 kg (210 ml) | ✓ |
| Build + deploy | ✓ |

## Data summary

| Product | Carton | Weight | Shared packaging |
|---------|--------|--------|------------------|
| CPL 55 ml | 72 bottles | 4.5 kg | bottle, cap, small box, big box with CPM 55 ml |
| CPM 55 ml | 72 bottles | 4.5 kg | same |
| CPL 210 ml | 12 bottles | 3 kg | bottle, pump, box with CPM 210 ml |
| CPM 210 ml | 12 bottles | 3 kg | same |

Labels are unique per product line (front + back each).

## UAT (manual on live)

- [ ] PO `/new-order` — four CPL/CPM rows visible
- [ ] Haider `/dispatch/inventory` — shared SKUs show once
- [ ] Waleed `/admin/packaging-alerts` — no duplicate shared bottle rows
- [ ] Rashid plan — Add product lists CPL/CPM with correct tasks
- [ ] Test PO deliver — packaging deducts correctly
