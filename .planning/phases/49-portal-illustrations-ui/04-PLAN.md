---
wave: 3
depends_on: ["02", "03"]
gap_closure: false
files_modified:
  - "app/globals.css"
  - "lib/ui.ts"
  - "components/PageHeader.tsx"
  - "app/(auth)/login/page.tsx"
autonomous: true
---

<phase_goal>
Polish the overall frontend to feel **more colorful and modern** while keeping readability — shared tokens, login harmony, and subtle component upgrades.
</phase_goal>

<must_haves>
- [ ] Extended color tokens: portal accent hues + slightly richer `app-shell` gradients (not flat gray).
- [ ] Login page optionally picks up a small accent consistent with signup (no duplicate large hero unless space allows a cropped thumbnail).
- [ ] `PageHeader` optional `className` or variant for accent underline / tinted description.
- [ ] Cards and empty states use slightly warmer borders / accent-tinted muted backgrounds where portal shell is active.
- [ ] No regression to print styles or data tables.
</must_haves>

<tasks>
  <task id="T1" title="Global token refresh">
    <step>In `globals.css`, enrich `--surface-base` gradient and add portal accent CSS variables.</step>
    <step>Add optional `.app-card-accent` variant for highlighted summary cards.</step>
  </task>

  <task id="T2" title="Login visual harmony">
    <step>Light touch on `login-brand-panel` — optional subtle pattern or accent dots matching signup palette.</step>
    <step>Ensure mobile single-column login still looks polished.</step>
  </task>

  <task id="T3" title="PageHeader polish">
    <step>Allow optional `accent` prop on `PageHeader` for a colored left border or title gradient (used on 1–2 key home pages if desired).</step>
  </task>

  <task id="T4" title="Build + smoke">
    <step>`npm run build`.</step>
    <step>Quick visual check: Rashid, Esha, Ali, signup, login.</step>
  </task>
</tasks>

<verification>
- UI feels noticeably more colorful vs current blue-gray baseline.
- Text contrast remains readable (WCAG-ish sanity check on hero text).
- `npm run build` passes.
</verification>
