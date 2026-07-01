# Phase 42 Verification

**Status:** passed  
**Date:** 2026-06-25

## Must-haves

| Item | Result |
|------|--------|
| `productionPurpose` on batches (regular/sample) | ✓ Model + API |
| Sample pool lib + FIFO deduction | ✓ `sampleProductionStock.ts` |
| Regular batches only on PO assignment | ✓ Filters applied |
| Esha UI tabs + purpose selector | ✓ Batches page + form |
| Field visit outgoing delivery deducts pool | ✓ `record_sample_event` |
| Insufficient stock → 400 | ✓ |
| Bottles qty per sample line | ✓ Form + parse |
| Waleed approval shows sample stock | ✓ Admin table |
| Build + deploy | ✓ |

## Manual UAT suggested

1. Esha: register 10 L Brighten **sample** batch → appears under Sample tab only
2. Rep: request outgoing sample → Waleed approves → record delivery → pool decreases
3. Rashid: regular Brighten batch still full on PO assign dropdown
