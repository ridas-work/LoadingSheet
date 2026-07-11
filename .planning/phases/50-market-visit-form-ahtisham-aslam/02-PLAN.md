---
wave: 1
depends_on: []
files_modified:
  - app/api/field-visits/route.ts
  - app/api/field-visits/[id]/route.ts
  - lib/fieldVisitTickets.ts
autonomous: true
---

# Plan 02 — API: create, read, update market visits

## Objective

API creates `market_audit` tickets for Aslam/Ahtisham and supports PATCH of market visit grid data. Block sample/meeting actions on market tickets.

## Tasks

<task id="02-1">
**POST `/api/field-visits`**: After auth, set `visitKind` from `defaultVisitKindForUser(session.username)`.
For `market_audit`: initialize `marketVisitDate: new Date()`, `marketVisitRows: []`, skip sales-only defaults (sampleMode can stay unset or `"none"`).
</task>

<task id="02-2">
**GET** list/detail: include `visitKind` and market fields in JSON (already via serializer from plan 01).
</task>

<task id="02-3">
**PATCH `/api/field-visits/[id]`**: Accept body fields when `visitKind === "market_audit"`:
- `marketVisitDate`, `marketVisitRemarks`, `marketVisitRows`
- Validate: each row has storeName; facing units are non-negative integers or null; availability values in `yes|no|""`
- Reject PATCH of `sampleMode`, `visitLogs`, `sampleProducts` on market_audit (400)
</task>

<task id="02-4">
**Submit action** (optional endpoint or PATCH flag `submitMarketVisit: true`):
- Set `marketVisitSubmittedAt`, optionally `status: "closed_won"` or new status `submitted` — prefer `active` with `marketVisitSubmittedAt` for simplicity unless list filters need change
- Require at least one row with storeName
</task>

<task id="02-5">
Guard existing sample approval / visit log / close-won routes: if ticket `visitKind !== "sales"`, return 400 with clear message.
</task>

## Verification

- [ ] Aslam creates visit → response has `visitKind: "market_audit"`
- [ ] Nouman creates visit → `visitKind: "sales"` unchanged
- [ ] PATCH market rows persists and reloads correctly
- [ ] Sample approval POST on market ticket returns 400

## must_haves

- Create path auto-discriminates by rep username
- Market visit data round-trips through API
- Sales-only mutations blocked on market_audit tickets
