# Phase 25 Verification

**Status:** passed  
**Date:** 2026-06-03

| Check | Status |
|-------|--------|
| Balance = Purchased − Rejected − UIP | ✓ |
| Haider cannot edit UIP | ✓ |
| Rashid fill → UIP delta | ✓ |
| Zaman delivered → UIP + movements | ✓ |
| Insufficient balance blocks fill/deliver | ✓ |
| `npm run build` | ✓ |

## Manual UAT

1. Haider: set purchased on a bottle SKU → balance updates; UIP column not editable
2. Rashid: save filling with 10 bottles → UIP +10 on mapped bottle
3. Zaman: mark PO delivered → UIP increases for stickers/cartons/bottles; green confirmation
