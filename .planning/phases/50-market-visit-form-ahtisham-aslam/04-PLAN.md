---
wave: 2
depends_on: ["01-PLAN.md", "02-PLAN.md", "03-PLAN.md"]
files_modified:
  - app/(app)/field-visits/page.tsx
  - app/(app)/field-visits/[id]/page.tsx
  - components/FieldVisitList.tsx
  - app/(app)/admin/field-visits/page.tsx
autonomous: true
---

# Plan 04 — Routing, list copy, admin view, verification

## Objective

Wire market visit UI only for Ahtisham/Aslam; leave Nouman/Javeria on existing `FieldVisitDetailForm`. Update list/admin labels.

## Tasks

<task id="04-1">
`app/(app)/field-visits/[id]/page.tsx`:
- Fetch ticket as today
- If `ticket.visitKind === "market_audit"` → render `<MarketVisitForm />` with edit permission from `canEditFieldVisit`
- Else → render `<FieldVisitDetailForm />` (unchanged)
</task>

<task id="04-2">
`components/FieldVisitList.tsx`:
- Accept optional `visitKindHint` or detect session user via prop from page
- For market reps: page title/description "Market visits" / "Record store availability and shelf facing"
- Hide or de-emphasize sample mode column, follow-up filters not relevant — show "Market" vs "Sales" badge on cards
- Extend search to market row store names (if not done in serializer search on client)
</task>

<task id="04-3">
`app/(app)/field-visits/page.tsx`: pass rep-specific hero copy for aslam/ahtisham vs nouman/javeria (use session username from server component).
</task>

<task id="04-4">
`app/(app)/admin/field-visits/page.tsx`: show visit kind badge; link opens correct form (market read-only vs sales).
</task>

<task id="04-5">
**Regression check** — manually verify:
- Nouman: new visit → sales form with samples/meetings unchanged
- Javeria: same
- Aslam: new visit → market form only
- Ahtisham: can view Aslam's market visit read-only
- Waleed approvals: no market_audit tickets
</task>

## Verification criteria (phase goal)

| # | Check |
|---|-------|
| 1 | Ahtisham/Aslam field visit = Market Visit Form layout |
| 2 | Availability Y/N + facing units per store row |
| 3 | Nouman/Javeria unchanged |
| 4 | Print usable |
| 5 | No sample approval for market visits |

## must_haves

- Username-based routing does not affect Nouman/Javeria code paths
- Market reps never see sample collection UI on new visits
- Admin can distinguish and open both visit kinds
