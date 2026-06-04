# Plan 01 — Field visit model & APIs

**Status:** Complete

## Delivered

- `FieldVisitTicket` Mongoose model with full lifecycle statuses
- `lib/fieldVisitTickets.ts` — access control (nouman/javeria only), +10/−5 points, **14-day follow-up** reminder logic
- `GET/POST /api/field-visits`, `GET/PATCH /api/field-visits/[id]`
- Optional `visitTicketId` on order create → auto `closed_won` with points

## Verification

- `npm run build` passes
