# Phase 53 Research: Market visit N alerts (persist across visits)

## Goal

When **Aslam** or **Ahtisham** mark a SKU **N** (not available) on the market visit form, that cell is **red**. On the **next visit to the same store**, those SKUs stay **red** until the rep marks **Y** — then that alert clears; any other still-open N alerts remain for future visits.

## User workflow

1. Visit **Al Fatah / Lahore** — mark **Ocean 1000 ML = N** → cell turns red; save/submit persists alert.
2. Next week, new market visit — add same store → **Ocean** column shows red even before selecting a value (reminder).
3. Rep marks **Ocean = Y** → red clears; save/submit resolves alert.
4. If **Lemon** was still N from an older visit, it stays red on the next form until fixed.

## Current implementation (Phase 50)

| Piece | Location |
|-------|----------|
| Form UI | `components/MarketVisitForm.tsx` — Y/N dropdown per SKU, no styling by value |
| Row data | `marketVisitRows[].availability: Record<skuKey, "yes" \| "no" \| "">` |
| Store identity | `storeName` + `location` text fields (no master store table) |
| Submit | PATCH `submit_market_visit` sets `marketVisitSubmittedAt` |
| Reps | `aslam`, `ahtisham` — `visitKind: "market_audit"` |

Alerts must be **cross-ticket**: each visit is a new `FieldVisitTicket`; persistence cannot live only inside one ticket's rows.

## Recommended design

### Open-alert registry (new collection)

`MarketVisitStoreAlert` — one open row per **store + SKU**:

```typescript
{
  storeKey: string,        // normalize(storeName, location)
  storeName: string,       // latest display label
  location: string,
  skuKey: string,          // from market-visit-sku-catalog
  openedAt: Date,
  openedByVisitId: ObjectId,
  openedByUsername: string,
  resolvedAt: Date | null,
  resolvedByVisitId: ObjectId | null,
}
```

- **Index:** unique partial `{ storeKey: 1, skuKey: 1 }` where `resolvedAt: null`
- **Open alert:** `resolvedAt === null`
- **Store key:** `slug(storeName) + "::" + slug(location)` — trim, lowercase, collapse spaces

### Sync rules (on draft save **and** submit)

For each row with non-empty `storeName`:

| Current availability | Action |
|---------------------|--------|
| `"no"` | Upsert open alert (refresh `openedAt` / visit id if already open) |
| `"yes"` | Resolve alert (`resolvedAt = now`, `resolvedByVisitId`) |
| `""` | No change to alert state |

Only process rows the user actually filled (store name present). Empty SKU cells do not auto-resolve.

### UI rules (`MarketVisitForm` availability table)

Cell background **red** when:

- `availability[sku] === "no"` **OR**
- `openAlerts[storeKey]?.includes(sku)` **and** `availability[sku] !== "yes"`

Cell **normal** when `yes`. Optional subtle border when carried-over alert cleared this session.

Fetch open alerts:

- `GET /api/market-visit-alerts?storeKeys=a,b,c` when rows change (debounced) or on load for filled store names
- Or embed in `GET /api/field-visits/[id]` response as `openAlertsByStoreKey`

### Scope boundaries

- **Availability section only** — facing units table unchanged
- **Market audit tickets only** — no impact on Nouman/Javeria sales visits
- **Shared across Aslam & Ahtisham** — same store key = same alert pool (factory-wide store list)
- **Print** — red styling optional in print CSS (`print:bg-white` unless user wants red on paper)

## Files to touch

| File | Change |
|------|--------|
| `lib/models/MarketVisitStoreAlert.ts` | New schema |
| `lib/marketVisitAlerts.ts` | `storeKey()`, sync + query helpers |
| `app/api/market-visit-alerts/route.ts` | GET open alerts by store keys |
| `app/api/field-visits/[id]/route.ts` | Call sync on market visit PATCH |
| `components/MarketVisitForm.tsx` | Red cell classes + fetch alerts |
| `app/globals.css` | `.market-visit-cell-alert`, `.market-visit-cell-no` |

## Risks / decisions

| Question | Decision |
|----------|----------|
| Draft vs submit only? | Sync on **both** `update_market_visit` and `submit_market_visit` so red persists after save draft |
| Store rename? | Alerts keyed by normalized key; renaming store starts fresh unless name matches same key |
| Historical backfill? | Optional script: scan submitted visits, build alerts from latest N per store+SKU — skip in v1 unless needed |

## Success criteria

- Selecting **N** turns cell red immediately
- Same store on a later visit shows red on SKUs still open
- Marking **Y** clears red and resolves alert for that SKU only
- Other open SKUs at that store remain red on next visit
