# Phase 40 Verification — Rashid daily plan portal

## Must-haves

- [ ] Waleed saves morning plan → Rashid sees it on `/dispatch/daily-plan`
- [ ] Rashid enters status per row → day marked **closed**
- [ ] Waleed next-day plan shows **carry-in** from yesterday when same employee+task line exists
- [ ] Ali (trip planner) cannot access `/dispatch/daily-plan` or dispatch API
- [ ] Rashid cannot access `/admin/rashid-daily-plan` morning plan editor

## UAT steps

1. **Waleed** — Admin → Rashid plan → New plan for today → save with helpers + tasks.
2. **Rashid** — Nav **Daily plan** → today shows **Planned** → View plan → Record end-of-day status → enter achieved qty → Save.
3. **Waleed** — New plan for tomorrow → same employee+task rows show carry-in = yesterday carry-forward.
4. **Rashid** — Closed day shows carry-forward column on plan view.

## Build

- [ ] `npm run build` passes
- [ ] `pm2 restart loadingsheet` deployed
