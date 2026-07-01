# Phase 43 Verification — Esha close batch + waste

**Status:** passed (build + route smoke)

## Must-haves

| Item | Status |
|------|--------|
| Closure schema on `ProductionBatch` | ✓ |
| `openProductionBatchMongoFilter` on assignable pools | ✓ |
| `POST .../close` API | ✓ |
| Mutation guards on closed batches | ✓ |
| `/production/batches/closed` | ✓ |
| Close form on batch detail | ✓ |
| Read-only closed detail | ✓ |
| Active list excludes closed | ✓ |
| `npm run build` | ✓ |
| PM2 restart | ✓ |

## Manual UAT (Esha)

1. Open an **approved** batch with remaining liters → **Close batch** section visible.
2. Check confirm, enter waste ≤ remaining → **Close batch** → lands on **Closed batches**.
3. Open closed batch → closure record shown, no Edit.
4. `/production/batches/[id]/edit` on closed batch → redirects to detail.
5. Rashid loading sheet batch picker does not offer closed batch.
