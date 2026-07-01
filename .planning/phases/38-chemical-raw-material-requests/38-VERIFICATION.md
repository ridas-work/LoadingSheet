# Phase 38 Verification — Chemical raw materials (Ramazan only)

**Status:** `passed`  
**Verified:** 2026-06-24

## Must-haves

| # | Requirement | Result |
|---|-------------|--------|
| 1 | Ramazan user with `chemicals_editor` role | ✓ `ramazan` seeded |
| 2 | 280 chemical materials catalog from user list | ✓ `data/chemical-raw-materials.json` |
| 3 | Ramazan portal: material name + stock available + request | ✓ `/chemicals/inventory` |
| 4 | Waleed admin: approve + mark ordered | ✓ `/admin/chemical-requests` |
| 5 | Pending requests banner on admin home | ✓ `ChemicalRequestsBanner` |
| 6 | No Rashid access to chemical materials | ✓ `roles.ts` — only `chemicals_editor` + `admin` |
| 7 | Build passes | ✓ `npm run build` |
| 8 | DB seeded | ✓ `npm run seed:chemical-materials` — 280 rows |

## Scope note

User clarified: **no Rashid role** in this phase — Ramazan only manages stock and submits requests.

## Manual UAT (recommended)

1. Login `ramazan` / `Ramazan-Chemicals-01` → `/chemicals/inventory` — search, edit stock, submit request
2. Login `waleed` → `/admin/chemical-requests` — approve, mark ordered
3. Login `rashid` → confirm `/chemicals/inventory` is blocked
