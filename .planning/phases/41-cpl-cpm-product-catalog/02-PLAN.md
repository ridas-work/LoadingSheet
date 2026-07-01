---
wave: 2
depends_on:
  - "01-PLAN.md"
gap_closure: false
files_modified:
  - "data/packaging-reorder-thresholds.json"
  - "data/rashid-plan-product-tasks.json"
  - "data/standard-carton-weights.json"
autonomous: true
---

<phase_goal>
Wire CPL/CPM into **Waleed reorder alerts**, **Rashid daily plan product tasks**, and **standard carton weight list** (Phase 30). Shared components use **one alert row** per SKU (Washout shared-pool pattern).
</phase_goal>

<must_haves>
- [ ] `data/packaging-reorder-thresholds.json` — add rules:

**Shared pools (55 ml) — threshold 1000**
- `shared-cpl-cpm-55ml-bottle` → `cpl-cpm-55ml-bottle`
- `shared-cpl-cpm-55ml-cap` → `cpl-cpm-55ml-cap`
- `shared-cpl-cpm-55ml-small-box` → `cpl-cpm-55ml-small-box`
- `shared-cpl-cpm-55ml-big-box` → `cpl-cpm-55ml-big-box`

**Shared pools (210 ml) — threshold 500**
- `shared-cpl-cpm-210ml-bottle` → `cpl-cpm-210ml-bottle`
- `shared-cpl-cpm-210ml-pump` → `cpl-cpm-210ml-pump`
- `shared-cpl-cpm-210ml-box` → `cpl-cpm-210ml-box`

**Label item_threshold — threshold 1000 each**
- `cpl-55ml-label-front`, `cpl-55ml-label-back`, `cpm-55ml-label-front`, `cpm-55ml-label-back`
- `cpl-210ml-label-front`, `cpl-210ml-label-back`, `cpm-210ml-label-front`, `cpm-210ml-label-back`

**Optional finished-product rules** (`product_any_component`, threshold 1000):
- `cpl-55ml`, `cpm-55ml`, `cpl-210ml`, `cpm-210ml`

Do **not** duplicate shared components under per-product rules (would re-show 3× alerts).

- [ ] `data/rashid-plan-product-tasks.json` — four blocks:

**CPL 55 ml** (`productCode: cpl-55ml`, `displayName: CPL 55 ml`):
- cap → `cpl-cpm-55ml-cap`
- bottle → `cpl-cpm-55ml-bottle`
- label front / back → respective label codes
- small box → `cpl-cpm-55ml-small-box`
- big box → `cpl-cpm-55ml-big-box`
- filling (no packaging code)

**CPM 55 ml** — same shared codes; CPM label codes.

**CPL 210 ml** — pump, bottle, labels, box (`cpl-cpm-210ml-*`), filling.

**CPM 210 ml** — same; CPM label codes.

- [ ] `data/standard-carton-weights.json` — four rows:
```json
{ "packingCode": "cpl-55ml", "bottlesPerCarton": 72, "standardWeightKg": <TBD> },
{ "packingCode": "cpm-55ml", "bottlesPerCarton": 72, "standardWeightKg": <TBD> },
{ "packingCode": "cpl-210ml", "bottlesPerCarton": 12, "standardWeightKg": <TBD> },
{ "packingCode": "cpm-210ml", "bottlesPerCarton": 12, "standardWeightKg": <TBD> }
```
If factory weights unknown, use **placeholder** values and document in phase README that Waleed must update before Phase 30 gate enforcement.
</must_haves>

<tasks>
  <task id="T1" title="Reorder thresholds">
    <step>Add shared_pool + item_threshold rules per must_haves.</step>
    <step>Remove any duplicate per-product rules that would alert on shared SKUs twice.</step>
  </task>
  <task id="T2" title="Rashid plan tasks">
    <step>Append four product blocks to `rashid-plan-product-tasks.json` sorted with existing products (alphabetical by displayName).</step>
    <step>Verify `GET /api/admin/rashid-daily-plan/products` returns new codes (no code change expected — JSON-driven).</step>
  </task>
  <task id="T3" title="Standard carton weights">
    <step>Add four packingCode rows; ask Waleed for kg if not in spec.</step>
  </task>
</tasks>

<verification>
- `buildPackagingReorderAlerts` with mock items: each shared SKU appears **once** in alerts when below threshold.
- Rashid plan form **Add product** lists CPL 55 ml, CPM 55 ml, CPL 210 ml, CPM 210 ml with correct task breakdown.
</verification>
