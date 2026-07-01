# Plan 02 Summary — Intake + approve APIs

**Status:** Complete

## Delivered
- `POST/GET /api/chemical-intakes` — Esha records QC intake; approved adds stock via movement ledger
- `PATCH /api/admin/chemical-material-requests/[id]` — approve deducts stock atomically; 400 on shortage
- `PATCH /api/chemical-materials/[code]` — admin adjust logs `admin_adjust` movement
