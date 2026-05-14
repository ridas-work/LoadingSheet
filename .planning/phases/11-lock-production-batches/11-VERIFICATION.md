# Phase 11 Verification

**Status:** passed  
**Date:** 2026-05-14

## Must-haves

| Item | Result | Evidence |
|------|--------|----------|
| Status helper + lock | pass | `lib/productionBatchStatus.ts` |
| PATCH 403 when in use | pass | `app/api/production-batches/[id]/route.ts` |
| API usage fields | pass | GET list + `[id]` |
| List Status column | pass | `production/batches/page.tsx` |
| Row actions hidden when locked | pass | `ProductionBatchRowActions.tsx` |
| Detail + edit redirect | pass | `[id]/page.tsx`, `[id]/edit/page.tsx` |
| Build | pass | `npm run build` exit 0 |
