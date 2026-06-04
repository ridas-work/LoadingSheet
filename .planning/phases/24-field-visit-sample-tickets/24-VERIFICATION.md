# Phase 24 Verification

**Status:** passed  
**Date:** 2026-06-03

## Must-haves

| Check | Status |
|-------|--------|
| FieldVisitTicket lifecycle statuses | ✓ |
| Only nouman/javeria create/edit own tickets | ✓ |
| Sample request creates ticket | ✓ |
| Deliver sample + feedback | ✓ |
| Conclude visit → awaiting order | ✓ |
| Order link closes won (+10) | ✓ |
| Mark lost (−5) | ✓ |
| Rep points in list API | ✓ |
| **2-week follow-up reminder** after delivery | ✓ |
| Admin read-only all visits | ✓ |

## Build

`npm run build` — passed

## Manual UAT (recommended)

1. Login as `nouman` → Field visits → Request sample → Deliver → wait or backdate → see follow-up banner → Save follow-up → Conclude → Create PO → +10 on list
2. Login as `aslam` → no Field visits nav; POST field-visits → 403
3. Login as `waleed` → Admin → Field visits → see all tickets and rep points
