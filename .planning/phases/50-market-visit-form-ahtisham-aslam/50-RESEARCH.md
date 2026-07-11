# Phase 50 Research: Market visit form (Ahtisham & Aslam)

## Goal

Replace the **sales / sample field visit** workflow for **Ahtisham** and **Aslam** with a **Market Visit Form** matching the paper template: store-by-store **availability (Y/N)** and **facing display (units)** across a fixed SKU grid. **Nouman** and **Javeria** keep the existing field visit UI unchanged.

## Paper form structure (user image)

**Header:** `MARKET VISIT FORM DATED ___`

**Per store row:**
| Store name | Location | …product columns… | Remarks |

**Section A — Availability YES/NO** (same column headers)

**Section B — FACING DISPLAY IN UNIT** (same column headers)

**Product columns (14 SKUs):**

| Group | SKU key | Label on form |
|-------|---------|---------------|
| Washout | washout-lemon-1l | LEMON 1000 ML |
| Washout | washout-ocean-1l | OCEAN 1000 ML |
| Washout | washout-floral-1l | FLORAL 1000 ML |
| Rhino | rhino-750ml | BOTTLE 750 ML |
| Rhino | rhino-500ml | BOTTLE 500 ML |
| Rhino | rhino-250ml | BOTTLE 250 ML |
| Fabrito | fabrito-bottle-1l | BOTTLE 1000 ML |
| Fabrito | fabrito-pouch-1l | POUCH 1000 ML |
| Brighten | brighten-bottle-1l | BOTTLE 1000 ML |
| Brighten | brighten-pouch-1l | POUCH 1000 ML |
| Power Wash | power-wash-bottle-500ml | BOTTLE 500 ML |
| Power Wash | power-wash-pouch-1l | POUCH 1000 ML |
| Degreaser | degrease-750ml | BOTTLE 750 ML |
| Titan | titan-jar-125kg | JAR 1.25 KG |

**Footer:** General `REMARKS` (free text, full width)

Map SKU keys to catalog `packingCode` where useful for future reporting (`washout-lemon`, `rhino-750ml`, etc.) — stored in `data/market-visit-sku-catalog.json`.

## Current codebase

| Area | Location | Notes |
|------|----------|-------|
| Rep usernames | `lib/fieldVisitTickets.ts` | `aslam`, `ahtisham` in view-only pool; `nouman`/`javeria` edit pool |
| Ticket model | `lib/models/FieldVisitTicket.ts` | Sales workflow: visitLogs, sampleMode, approval, points |
| Detail UI | `components/FieldVisitDetailForm.tsx` | Large form — samples, meetings, follow-up |
| List UI | `components/FieldVisitList.tsx` | Shared list; "New visit" → draft ticket |
| API | `app/api/field-visits/*` | CRUD + sample approval actions |
| Admin | `app/(app)/admin/field-visits/page.tsx` | Read-only list |

## Recommended approach

### 1. Visit kind discriminator

Add `visitKind` on `FieldVisitTicket`:

- `"sales"` — default; Nouman/Javeria (unchanged behavior)
- `"market_audit"` — Ahtisham/Aslam market form

**Create rules:**
- POST `/api/field-visits`: if `createdByUsername` is `aslam` or `ahtisham` → `visitKind: "market_audit"`, `status: "active"` (or new simpler status `submitted` — prefer reusing `active` + `closed` via `marketVisitSubmittedAt`)
- Nouman/Javeria → `visitKind: "sales"` (existing)

### 2. Market visit payload (embedded on ticket)

```typescript
marketVisitDate: Date
marketVisitRemarks: string  // footer remarks
marketVisitRows: [{
  storeName: string
  location: string
  availability: Record<skuKey, "yes" | "no" | "">
  facingUnits: Record<skuKey, number | null>  // integer >= 0
  remarks: string
}]
marketVisitSubmittedAt?: Date | null
```

No `sampleMode`, `visitLogs`, or Waleed approval for `market_audit` tickets.

### 3. UI routing (username + visitKind)

| User | List page | New visit | Detail page |
|------|-----------|-----------|-------------|
| nouman, javeria | `/field-visits` (unchanged copy) | → sales draft → `FieldVisitDetailForm` | `FieldVisitDetailForm` |
| aslam, ahtisham | `/field-visits` (market copy) | → market draft → `MarketVisitForm` | `MarketVisitForm` |
| admin | all kinds | — | read-only appropriate form |

Implement via:
- `app/(app)/field-visits/[id]/page.tsx` — branch on `ticket.visitKind`
- `FieldVisitList` — different subtitle + hide sample/follow-up filters for market reps (optional: hide points leaderboard for aslam/ahtisham)

### 4. Permissions (unchanged pools)

- Aslam/Ahtisham: shared **view** pool (read-only on each other's forms) — already in `fieldVisitTickets.ts`
- Edit only own tickets (existing `canEditFieldVisit` for view-only pool)

### 5. Waleed / sample pipeline

- `market_audit` tickets **must not** appear in `/admin/approvals` sample queue
- Do **not** create sample dispatch orders from market visits
- Filter `pendingFieldVisitSampleMongoFilter` to `visitKind: "sales"` only

### 6. Print

- `MarketVisitForm` includes print stylesheet matching paper layout (landscape-friendly table, `@media print`)
- Header shows visit date; two table blocks (availability + facing) or one combined sheet per paper

### 7. List / search

- Extend `matchesSearch` to include store names, locations, market remarks
- List card shows: date, store count, "Market visit" badge vs "Sales visit"

## Out of scope

- Changing Nouman/Javeria forms or sample approval flow
- Analytics dashboard for market data (future phase)
- Mobile offline — standard responsive web only

## Risks

| Risk | Mitigation |
|------|------------|
| Wide table on phone | Horizontal scroll + sticky store name column |
| Legacy aslam/ahtisham sales tickets | Keep `visitKind: "sales"` default on old rows; only new creates are market |
| Accidental sample UI on market ticket | Server rejects sample actions when `visitKind !== "sales"` |

## Files to touch

- `data/market-visit-sku-catalog.json` (new)
- `lib/marketVisitCatalog.ts`, `lib/marketVisitTypes.ts` (new)
- `lib/models/FieldVisitTicket.ts`
- `lib/fieldVisitTickets.ts` — `isMarketVisitRep`, serialize market fields
- `app/api/field-visits/route.ts`, `[id]/route.ts`
- `components/MarketVisitForm.tsx` (new)
- `app/(app)/field-visits/page.tsx`, `[id]/page.tsx`
- `components/FieldVisitList.tsx` — rep-specific copy
- `app/(app)/admin/field-visits/page.tsx` — show visit kind

## Success criteria

- Ahtisham/Aslam open Field visits → see market-oriented instructions
- New visit opens grid form, not sample/meeting form
- Can add multiple store rows, fill Y/N + facing units, save and reopen
- Print matches paper layout reasonably
- Nouman/Javeria flow identical to today
- Waleed sample approvals exclude market visits
